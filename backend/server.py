from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(
    title="Eletrofunk Cachorrada API",
    description="API para votação de DJs de Eletrofunk e Cachorrada",
    version="1.0.0"
)

api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

ESTADOS_BR = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

def validate_cpf(cpf: str) -> bool:
    cpf = re.sub(r'[^\d]', '', cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for i in range(9, 11):
        value = sum((int(cpf[num]) * ((i + 1) - num) for num in range(0, i)))
        check = ((value * 10) % 11) % 10
        if check != int(cpf[i]):
            return False
    return True

class VotoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    cpf: str = Field(..., min_length=11, max_length=14)
    email: str
    whatsapp: str = Field(..., min_length=10, max_length=15)
    estado: str
    dj_id: str

    @field_validator('cpf')
    @classmethod
    def validate_cpf_field(cls, v):
        cpf_clean = re.sub(r'[^\d]', '', v)
        if not validate_cpf(cpf_clean):
            raise ValueError('CPF inválido')
        return cpf_clean

    @field_validator('estado')
    @classmethod
    def validate_estado(cls, v):
        if v.upper() not in ESTADOS_BR:
            raise ValueError('Estado inválido')
        return v.upper()

class Voto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cpf: str
    email: str
    whatsapp: str
    estado: str
    dj_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DJCreate(BaseModel):
    nome: str
    slug: str
    foto: Optional[str] = None
    bio: str
    instagram: Optional[str] = None
    soundcloud: Optional[str] = None
    spotify: Optional[str] = None
    keywords: List[str] = []

class DJ(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    slug: str
    foto: Optional[str] = None
    bio: str
    instagram: Optional[str] = None
    soundcloud: Optional[str] = None
    spotify: Optional[str] = None
    keywords: List[str] = []
    votos_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventoCreate(BaseModel):
    titulo: str
    data: str
    horario: str
    local: str
    cidade: str
    estado: str
    descricao: str
    preco: str
    foto: Optional[str] = None
    whatsapp_mensagem: Optional[str] = None

class Evento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titulo: str
    data: str
    horario: str
    local: str
    cidade: str
    estado: str
    descricao: str
    preco: str
    foto: Optional[str] = None
    whatsapp_mensagem: Optional[str] = None
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ArtigoCreate(BaseModel):
    titulo: str
    slug: str
    resumo: str
    conteudo: str
    keywords: List[str] = []
    imagem: Optional[str] = None

class Artigo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titulo: str
    slug: str
    resumo: str
    conteudo: str
    keywords: List[str] = []
    imagem: Optional[str] = None
    publicado: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Eletrofunk Cachorrada API", "version": "1.0.0"}

# --- VOTOS ---
@api_router.post("/votos", response_model=Voto)
async def criar_voto(input: VotoCreate):
    # Check if CPF already voted for this DJ
    existing = await db.votos.find_one({"cpf": input.cpf, "dj_id": input.dj_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Você já votou neste DJ!")
    
    voto_obj = Voto(**input.model_dump())
    doc = voto_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.votos.insert_one(doc)
    
    # Increment DJ vote count
    await db.djs.update_one({"id": input.dj_id}, {"$inc": {"votos_count": 1}})
    
    return voto_obj

@api_router.get("/votos/stats")
async def get_votos_stats():
    total = await db.votos.count_documents({})
    por_estado = await db.votos.aggregate([
        {"$group": {"_id": "$estado", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(100)
    return {"total": total, "por_estado": por_estado}

# --- DJS ---
@api_router.get("/djs", response_model=List[DJ])
async def get_djs():
    djs = await db.djs.find({}, {"_id": 0}).sort("votos_count", -1).to_list(100)
    return djs

@api_router.get("/djs/{slug}", response_model=DJ)
async def get_dj_by_slug(slug: str):
    dj = await db.djs.find_one({"slug": slug}, {"_id": 0})
    if not dj:
        raise HTTPException(status_code=404, detail="DJ não encontrado")
    return dj

@api_router.post("/djs", response_model=DJ)
async def criar_dj(input: DJCreate):
    existing = await db.djs.find_one({"slug": input.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Slug já existe")
    
    dj_obj = DJ(**input.model_dump())
    doc = dj_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.djs.insert_one(doc)
    return dj_obj

@api_router.get("/ranking")
async def get_ranking():
    djs = await db.djs.find({}, {"_id": 0, "id": 1, "nome": 1, "slug": 1, "foto": 1, "votos_count": 1}).sort("votos_count", -1).to_list(20)
    total_votos = sum(dj.get("votos_count", 0) for dj in djs)
    for dj in djs:
        dj["percentual"] = round((dj.get("votos_count", 0) / total_votos * 100), 1) if total_votos > 0 else 0
    return {"djs": djs, "total_votos": total_votos}

# --- EVENTOS ---
@api_router.get("/eventos", response_model=List[Evento])
async def get_eventos():
    eventos = await db.eventos.find({"ativo": True}, {"_id": 0}).sort("data", 1).to_list(50)
    return eventos

@api_router.post("/eventos", response_model=Evento)
async def criar_evento(input: EventoCreate):
    evento_obj = Evento(**input.model_dump())
    doc = evento_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.eventos.insert_one(doc)
    return evento_obj

# --- ARTIGOS ---
@api_router.get("/artigos", response_model=List[Artigo])
async def get_artigos():
    artigos = await db.artigos.find({"publicado": True}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return artigos

@api_router.get("/artigos/{slug}", response_model=Artigo)
async def get_artigo_by_slug(slug: str):
    artigo = await db.artigos.find_one({"slug": slug, "publicado": True}, {"_id": 0})
    if not artigo:
        raise HTTPException(status_code=404, detail="Artigo não encontrado")
    return artigo

@api_router.post("/artigos", response_model=Artigo)
async def criar_artigo(input: ArtigoCreate):
    existing = await db.artigos.find_one({"slug": input.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Slug já existe")
    
    artigo_obj = Artigo(**input.model_dump())
    doc = artigo_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.artigos.insert_one(doc)
    return artigo_obj

# --- SEED DATA ---
@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    djs_count = await db.djs.count_documents({})
    if djs_count > 0:
        return {"message": "Dados já existem", "djs": djs_count}
    
    # Seed DJs
    djs_data = [
        {
            "id": str(uuid.uuid4()),
            "nome": "DJ Vilão da Cachorrada",
            "slug": "dj-vilao-cachorrada",
            "foto": "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=400&q=80",
            "bio": "O rei do eletrofunk pesado 150 BPM. Especialista em cachorrada eletrônica e mandelão que faz tremer as caixas de som. Sets explosivos que dominam as raves de SP a RJ.",
            "instagram": "@vilao_cachorrada",
            "soundcloud": "vilao-cachorrada",
            "keywords": ["cachorrada eletrônica", "eletrofunk pesado", "funk 150 bpm", "dj cachorrada"],
            "votos_count": 156,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "nome": "DJ Trovão do Mandelão",
            "slug": "dj-trovao-mandelon",
            "foto": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
            "bio": "Mestre do funk deboxe e mandelão cachorrada. Criador de sets que são pura putaria eletrofunk. Conhecido por transformar qualquer pista em revoada.",
            "instagram": "@trovao_mandelon",
            "soundcloud": "trovao-mandelon",
            "keywords": ["funk deboxe cachorrada", "mandelão", "putaria eletrofunk", "funk rave"],
            "votos_count": 143,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "nome": "DJ Piranha Eletrônica",
            "slug": "dj-piranha-eletronica",
            "foto": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80",
            "bio": "A rainha do proibidão eletrônico. Seus sets de funk rave brasileiro são referência no cenário. Pioneira do som pra revoada com batidas que não deixam ninguém parado.",
            "instagram": "@piranha_eletronica",
            "soundcloud": "piranha-eletronica",
            "keywords": ["proibidão eletrônico", "funk rave brasileiro", "som pra revoada", "playlist eletrofunk"],
            "votos_count": 128,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "nome": "DJ Baile do Futuro",
            "slug": "dj-baile-futuro",
            "foto": "https://images.unsplash.com/photo-1526218626217-dc65a29bb444?auto=format&fit=crop&w=400&q=80",
            "bio": "Inovador do funk 2025 atualizado. Mistura elementos de EDM com a essência da cachorrada forte. Seus remixes de funk eletrônico são hits nas plataformas.",
            "instagram": "@baile_futuro",
            "spotify": "baile-futuro",
            "keywords": ["funk 2025 atualizado", "cachorrada forte", "remix funk eletrônico", "set funk pesado"],
            "votos_count": 97,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "nome": "MC Paredão Nuclear",
            "slug": "mc-paredao-nuclear",
            "foto": "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80",
            "bio": "O cara que revolucionou o modo cachorrada. Voz marcante e presença de palco que incendeia qualquer baile. Parceiro dos maiores DJs do eletrofunk.",
            "instagram": "@paredao_nuclear",
            "keywords": ["modo cachorrada", "funk cachorrada pesada", "eletrofunk cachorrada"],
            "votos_count": 84,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.djs.insert_many(djs_data)
    
    # Seed Eventos
    eventos_data = [
        {
            "id": str(uuid.uuid4()),
            "titulo": "MEGA CACHORRADA ELETRÔNICA 2025",
            "data": "15/02/2025",
            "horario": "23:00",
            "local": "Arena Eletrofunk",
            "cidade": "São Paulo",
            "estado": "SP",
            "descricao": "O maior evento de eletrofunk do Brasil! Line-up com os melhores DJs da cachorrada.",
            "preco": "R$ 80 - R$ 150",
            "foto": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
            "whatsapp_mensagem": "Olá! Quero comprar ingresso para MEGA CACHORRADA ELETRÔNICA 2025",
            "ativo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "titulo": "BAILE DO MANDELÃO - Edição Rio",
            "data": "22/02/2025",
            "horario": "22:00",
            "local": "Espaço Revoada",
            "cidade": "Rio de Janeiro",
            "estado": "RJ",
            "descricao": "A festa que não deixa ninguém parado! Funk deboxe e cachorrada a noite toda.",
            "preco": "R$ 60 - R$ 120",
            "foto": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
            "whatsapp_mensagem": "Olá! Quero comprar ingresso para BAILE DO MANDELÃO - Rio",
            "ativo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "titulo": "RAVE PROIBIDÃO ELETRÔNICO",
            "data": "08/03/2025",
            "horario": "00:00",
            "local": "Galpão Underground",
            "cidade": "Belo Horizonte",
            "estado": "MG",
            "descricao": "12 horas de puro eletrofunk pesado. Open bar e área VIP disponíveis.",
            "preco": "R$ 100 - R$ 250",
            "foto": "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=800&q=80",
            "whatsapp_mensagem": "Olá! Quero comprar ingresso para RAVE PROIBIDÃO ELETRÔNICO",
            "ativo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.eventos.insert_many(eventos_data)
    
    # Seed Artigos
    artigos_data = [
        {
            "id": str(uuid.uuid4()),
            "titulo": "O que é Cachorrada Eletrônica? Guia Completo 2025",
            "slug": "o-que-e-cachorrada-eletronica",
            "resumo": "Descubra tudo sobre o gênero que está dominando as raves brasileiras. História, principais DJs e onde encontrar os melhores sets.",
            "conteudo": "A cachorrada eletrônica é a fusão perfeita entre o funk carioca tradicional e as batidas pesadas da música eletrônica...",
            "keywords": ["cachorrada eletrônica", "eletrofunk", "funk rave brasileiro"],
            "imagem": "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?auto=format&fit=crop&w=800&q=80",
            "publicado": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "titulo": "Top 10 Sets de Funk Pesado 150 BPM para sua Playlist",
            "slug": "top-10-sets-funk-pesado-150-bpm",
            "resumo": "Os melhores sets de eletrofunk pesado selecionados para você. Batidas aceleradas e cachorrada pura.",
            "conteudo": "Se você está procurando por sets que fazem o chão tremer, veio ao lugar certo...",
            "keywords": ["funk pesado 150 bpm", "set funk pesado", "playlist eletrofunk"],
            "imagem": "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=800&q=80",
            "publicado": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "titulo": "Funk Deboxe Cachorrada: A Nova Onda das Raves",
            "slug": "funk-deboxe-cachorrada-nova-onda",
            "resumo": "Entenda por que o funk deboxe cachorrada está conquistando as pistas de dança do Brasil inteiro.",
            "conteudo": "O deboxe misturado com a cachorrada criou uma nova vertente que está revolucionando...",
            "keywords": ["funk deboxe cachorrada", "funk mandelão cachorrada", "funk rave"],
            "imagem": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80",
            "publicado": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "titulo": "Como Montar a Playlist Perfeita de Eletrofunk",
            "slug": "como-montar-playlist-eletrofunk",
            "resumo": "Dicas para criar a melhor seleção de músicas para seu rolê ou festa particular.",
            "conteudo": "Montar uma playlist de eletrofunk que funcione requer entender a progressão das batidas...",
            "keywords": ["playlist eletrofunk", "remix funk eletrônico", "funk 2025 atualizado"],
            "imagem": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
            "publicado": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "titulo": "Som pra Revoada: O Guia do Proibidão Eletrônico",
            "slug": "som-pra-revoada-proibidao-eletronico",
            "resumo": "Tudo que você precisa saber sobre o som que faz a galera subir nas caixas.",
            "conteudo": "O proibidão eletrônico é a expressão máxima da liberdade musical no funk brasileiro...",
            "keywords": ["som pra revoada", "proibidão eletrônico", "cachorrada forte"],
            "imagem": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
            "publicado": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.artigos.insert_many(artigos_data)
    
    return {"message": "Dados seed inseridos com sucesso!", "djs": len(djs_data), "eventos": len(eventos_data), "artigos": len(artigos_data)}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
