import requests
import sys
import json
from datetime import datetime

class EletrofunkAPITester:
    def __init__(self, base_url="https://cachorrada-vote.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, description=""):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if description:
            print(f"   Description: {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_data": None,
                "error": None
            }

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result["response_data"] = response.json()
                    if isinstance(result["response_data"], dict) and len(str(result["response_data"])) < 500:
                        print(f"   Response: {json.dumps(result['response_data'], indent=2)}")
                    elif isinstance(result["response_data"], list):
                        print(f"   Response: List with {len(result['response_data'])} items")
                except:
                    result["response_data"] = response.text[:200]
                    print(f"   Response: {response.text[:200]}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    result["error"] = error_data
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    result["error"] = response.text[:200]
                    print(f"   Error: {response.text[:200]}")

            self.test_results.append(result)
            return success, result.get("response_data", {})

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "EXCEPTION",
                "success": False,
                "response_data": None,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test(
            "API Root",
            "GET",
            "",
            200,
            description="Check if API is accessible"
        )

    def test_seed_data(self):
        """Test seeding initial data"""
        return self.run_test(
            "Seed Data",
            "POST",
            "seed",
            200,
            description="Initialize database with sample DJs, events, and articles"
        )

    def test_get_djs(self):
        """Test getting all DJs"""
        return self.run_test(
            "Get All DJs",
            "GET",
            "djs",
            200,
            description="Retrieve list of all DJs"
        )

    def test_get_ranking(self):
        """Test getting DJ ranking"""
        return self.run_test(
            "Get DJ Ranking",
            "GET",
            "ranking",
            200,
            description="Get DJs ranked by vote count with percentages"
        )

    def test_get_eventos(self):
        """Test getting events"""
        return self.run_test(
            "Get Events",
            "GET",
            "eventos",
            200,
            description="Retrieve list of active events"
        )

    def test_get_artigos(self):
        """Test getting articles"""
        return self.run_test(
            "Get Articles",
            "GET",
            "artigos",
            200,
            description="Retrieve list of published articles"
        )

    def test_vote_creation(self):
        """Test creating a vote"""
        # First get a DJ to vote for
        success, djs_data = self.test_get_djs()
        if not success or not djs_data:
            print("❌ Cannot test voting - no DJs available")
            return False, {}

        dj_id = djs_data[0]["id"]
        vote_data = {
            "nome": "João Silva Teste",
            "cpf": "11144477735",  # Valid CPF for testing
            "email": "joao.teste@email.com",
            "whatsapp": "21987654321",
            "estado": "RJ",
            "dj_id": dj_id
        }

        return self.run_test(
            "Create Vote",
            "POST",
            "votos",
            200,
            data=vote_data,
            description=f"Vote for DJ {djs_data[0]['nome']}"
        )

    def test_duplicate_vote_prevention(self):
        """Test that duplicate votes are prevented"""
        # First get a DJ to vote for
        success, djs_data = self.test_get_djs()
        if not success or not djs_data:
            print("❌ Cannot test duplicate vote - no DJs available")
            return False, {}

        dj_id = djs_data[0]["id"]
        vote_data = {
            "nome": "Maria Santos Teste",
            "cpf": "98765432100",  # Different CPF
            "email": "maria.teste@email.com",
            "whatsapp": "21987654322",
            "estado": "SP",
            "dj_id": dj_id
        }

        # First vote should succeed
        success1, _ = self.run_test(
            "First Vote (Should Succeed)",
            "POST",
            "votos",
            200,
            data=vote_data,
            description="First vote with new CPF"
        )

        # Second vote with same CPF should fail
        success2, _ = self.run_test(
            "Duplicate Vote (Should Fail)",
            "POST",
            "votos",
            400,
            data=vote_data,
            description="Duplicate vote with same CPF should be rejected"
        )

        return success1 and success2, {}

    def test_invalid_cpf_validation(self):
        """Test CPF validation"""
        success, djs_data = self.test_get_djs()
        if not success or not djs_data:
            print("❌ Cannot test CPF validation - no DJs available")
            return False, {}

        dj_id = djs_data[0]["id"]
        invalid_vote_data = {
            "nome": "Teste CPF Inválido",
            "cpf": "11111111111",  # Invalid CPF (all same digits)
            "email": "teste.cpf@email.com",
            "whatsapp": "21987654323",
            "estado": "RJ",
            "dj_id": dj_id
        }

        return self.run_test(
            "Invalid CPF Validation",
            "POST",
            "votos",
            422,  # Validation error
            data=invalid_vote_data,
            description="Vote with invalid CPF should be rejected"
        )

    def test_vote_stats(self):
        """Test vote statistics"""
        return self.run_test(
            "Vote Statistics",
            "GET",
            "votos/stats",
            200,
            description="Get voting statistics by state"
        )

    def test_dj_by_slug(self):
        """Test getting DJ by slug"""
        # First get DJs to find a valid slug
        success, djs_data = self.test_get_djs()
        if not success or not djs_data:
            print("❌ Cannot test DJ by slug - no DJs available")
            return False, {}

        slug = djs_data[0]["slug"]
        return self.run_test(
            "Get DJ by Slug",
            "GET",
            f"djs/{slug}",
            200,
            description=f"Get DJ details by slug: {slug}"
        )

    def test_article_by_slug(self):
        """Test getting article by slug"""
        # First get articles to find a valid slug
        success, articles_data = self.test_get_artigos()
        if not success or not articles_data:
            print("❌ Cannot test article by slug - no articles available")
            return False, {}

        slug = articles_data[0]["slug"]
        return self.run_test(
            "Get Article by Slug",
            "GET",
            f"artigos/{slug}",
            200,
            description=f"Get article details by slug: {slug}"
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Eletrofunk Cachorrada API Tests")
        print("=" * 60)

        # Basic connectivity tests
        self.test_root_endpoint()
        self.test_seed_data()

        # Data retrieval tests
        self.test_get_djs()
        self.test_get_ranking()
        self.test_get_eventos()
        self.test_get_artigos()

        # Voting functionality tests
        self.test_vote_creation()
        self.test_duplicate_vote_prevention()
        self.test_invalid_cpf_validation()
        self.test_vote_stats()

        # Slug-based retrieval tests
        self.test_dj_by_slug()
        self.test_article_by_slug()

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 FINAL RESULTS")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        # Print failed tests summary
        failed_tests = [test for test in self.test_results if not test["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test_name']}: {test['actual_status']} (expected {test['expected_status']})")
                if test.get('error'):
                    print(f"     Error: {test['error']}")

        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = EletrofunkAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())