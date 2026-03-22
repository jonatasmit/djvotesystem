import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Marquee from "react-fast-marquee";
import { Toaster, toast } from "sonner";
import { Volume2, VolumeX, Instagram, ChevronDown, MapPin, Calendar, Clock, Users, Music, Zap, ArrowRight } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WHATSAPP_NUMBER = "5521972232170";
const LOGO_URL = "https://customer-assets.emergentagent.com/job_cf83a940-d7dd-4a2a-b1d7-b5350862253d/artifacts/ia7e6z10_AB554670-F09D-4814-9E72-AEAD33654EC7.jpeg";
const BG_URL = "https://customer-assets.emergentagent.com/job_cf83a940-d7dd-4a2a-b1d7-b5350862253d/artifacts/4e3g8cul_IMG_0359.png";
const AUDIO_URL = "https://customer-assets.emergentagent.com/job_cachorrada-vote/artifacts/30jm4hwl_2d8da123-c8ea-4e2f-a392-42d298f4e176.mov";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

// Fade in animation variant
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

function App() {
  const [djs, setDjs] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [artigos, setArtigos] = useState([]);
  const [ranking, setRanking] = useState({ djs: [], total_votos: 0 });
  const [selectedDj, setSelectedDj] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteForm, setVoteForm] = useState({
    nome: "", cpf: "", email: "", whatsapp: "", estado: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    initData();
    fetchData();
  }, []);

  const initData = async () => {
    try {
      await axios.post(`${API}/seed`);
    } catch (e) {
      // Data might already exist
    }
  };

  const fetchData = async () => {
    try {
      const [djsRes, eventosRes, artigosRes, rankingRes] = await Promise.all([
        axios.get(`${API}/djs`),
        axios.get(`${API}/eventos`),
        axios.get(`${API}/artigos`),
        axios.get(`${API}/ranking`)
      ]);
      setDjs(djsRes.data);
      setEventos(eventosRes.data);
      setArtigos(artigosRes.data);
      setRanking(rankingRes.data);
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  const handleFirstInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // Autoplay blocked
        });
      }
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVoteClick = (dj) => {
    setSelectedDj(dj);
    setShowVoteModal(true);
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  };

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDj) return;

    setIsSubmitting(true);
    try {
      await axios.post(`${API}/votos`, {
        ...voteForm,
        cpf: voteForm.cpf.replace(/\D/g, ''),
        whatsapp: voteForm.whatsapp.replace(/\D/g, ''),
        dj_id: selectedDj.id
      });
      toast.success(`Voto registrado para ${selectedDj.nome}!`, {
        description: "Obrigado por participar!",
        style: { background: '#121212', border: '1px solid #E01A4F', color: '#fff' }
      });
      setShowVoteModal(false);
      setVoteForm({ nome: "", cpf: "", email: "", whatsapp: "", estado: "" });
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || "Erro ao votar. Tente novamente.";
      toast.error(message, {
        style: { background: '#121212', border: '1px solid #E01A4F', color: '#fff' }
      });
    }
    setIsSubmitting(false);
  };

  const openWhatsApp = (mensagem) => {
    const msg = encodeURIComponent(mensagem || "Olá! Vim pelo site Eletrofunk Cachorrada");
    window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${msg}`, '_blank');
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div onClick={handleFirstInteraction}>
      <Toaster position="top-center" />
      <div className="noise-overlay" />
      
      {/* Audio */}
      <audio ref={audioRef} src={AUDIO_URL} loop />
      
      {/* Audio Toggle */}
      <button
        onClick={toggleAudio}
        className={`audio-toggle ${isPlaying ? 'playing' : ''}`}
        data-testid="audio-toggle"
        aria-label={isPlaying ? "Pausar música" : "Tocar música"}
      >
        {isPlaying ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>

      {/* Hero Section */}
      <section className="hero-section" data-testid="hero-section">
        <div className="hero-bg" style={{ backgroundImage: `url(${BG_URL})` }} />
        <div className="hero-overlay" />
        
        <motion.div
          className="relative z-10 text-center px-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.img
            src={LOGO_URL}
            alt="Eletrofunk Cachorrada"
            className="w-64 md:w-80 lg:w-96 mx-auto mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            data-testid="hero-logo"
          />
          
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 neon-text-magenta glitch-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            VOTE NO SEU DJ
          </motion.h1>
          
          <motion.p
            className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            O maior portal de <span className="text-[#00FFFF]">cachorrada eletrônica</span> e{" "}
            <span className="text-[#E01A4F]">eletrofunk pesado</span> do Brasil
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={() => scrollToSection('votacao')}
              className="btn-brutal bg-[#E01A4F] text-white px-8 py-4 text-lg"
              data-testid="cta-vote-btn"
            >
              VOTAR AGORA
            </button>
            <button
              onClick={() => scrollToSection('eventos')}
              className="btn-brutal bg-transparent border-2 border-[#00FFFF] text-[#00FFFF] px-8 py-4 text-lg"
              data-testid="cta-events-btn"
            >
              VER EVENTOS
            </button>
          </motion.div>
        </motion.div>
        
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ChevronDown size={32} className="text-[#00FFFF]" />
        </motion.div>
      </section>

      {/* Marquee */}
      <div className="marquee-container">
        <Marquee speed={80} gradient={false}>
          <span className="marquee-text mx-8">ELETROFUNK</span>
          <span className="marquee-text mx-8">•</span>
          <span className="marquee-text mx-8">CACHORRADA</span>
          <span className="marquee-text mx-8">•</span>
          <span className="marquee-text mx-8">MANDELÃO</span>
          <span className="marquee-text mx-8">•</span>
          <span className="marquee-text mx-8">FUNK RAVE</span>
          <span className="marquee-text mx-8">•</span>
          <span className="marquee-text mx-8">150 BPM</span>
          <span className="marquee-text mx-8">•</span>
          <span className="marquee-text mx-8">PROIBIDÃO</span>
          <span className="marquee-text mx-8">•</span>
          <span className="marquee-text mx-8">DEBOXE</span>
          <span className="marquee-text mx-8">•</span>
        </Marquee>
      </div>

      {/* Voting Section */}
      <section id="votacao" className="py-20 px-4 md:px-8" data-testid="voting-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            {...fadeInUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              RANKING DOS <span className="text-[#00FFFF]">DJS</span>
            </h2>
            <p className="text-gray-400 text-lg">
              {ranking.total_votos} votos registrados
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {ranking.djs.map((dj, index) => (
              <motion.div
                key={dj.id}
                variants={fadeInUp}
                className="dj-card glass p-6 border border-[#E01A4F]/30"
                data-testid={`dj-card-${dj.slug}`}
              >
                <div className="flex items-start gap-4">
                  <span className="ranking-number">#{index + 1}</span>
                  <div className="flex-1">
                    <div className="w-20 h-20 mb-4 overflow-hidden border border-[#00FFFF]">
                      <img
                        src={dj.foto || "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=200&q=80"}
                        alt={dj.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{dj.nome}</h3>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{dj.votos_count} votos</span>
                        <span className="text-[#00FFFF]">{dj.percentual}%</span>
                      </div>
                      <div className="h-2 bg-[#121212] border border-[#E01A4F]/30">
                        <div
                          className="h-full bg-gradient-to-r from-[#E01A4F] to-[#8A2BE2] progress-bar"
                          style={{ width: `${dj.percentual}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleVoteClick(dj)}
                      className="btn-brutal w-full bg-[#E01A4F] text-white py-2 text-sm"
                      data-testid={`vote-btn-${dj.slug}`}
                    >
                      <Zap size={16} className="inline mr-2" />
                      VOTAR
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* DJs Profiles Section */}
      <section id="djs" className="py-20 px-4 md:px-8 bg-[#0a0a0a]" data-testid="djs-section">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-center"
            {...fadeInUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
          >
            CONHEÇA OS <span className="text-[#E01A4F]">ARTISTAS</span>
          </motion.h2>
          <p className="text-gray-400 text-center mb-16">Os maiores nomes do eletrofunk e cachorrada</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {djs.map((dj, index) => (
              <motion.article
                key={dj.id}
                className="glass border border-[#E01A4F]/20 p-6 md:p-8"
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`dj-profile-${dj.slug}`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-48 h-48 overflow-hidden border-2 border-[#00FFFF] flex-shrink-0">
                    <img
                      src={dj.foto || "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=400&q=80"}
                      alt={`${dj.nome} - DJ de ${dj.keywords?.join(', ') || 'eletrofunk'}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 text-[#00FFFF]">{dj.nome}</h3>
                    <p className="text-gray-300 mb-4 leading-relaxed">{dj.bio}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {dj.keywords?.slice(0, 4).map((kw, i) => (
                        <span key={i} className="text-xs px-3 py-1 bg-[#E01A4F]/20 border border-[#E01A4F]/40 text-[#E01A4F]">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4">
                      {dj.instagram && (
                        <a
                          href={`https://instagram.com/${dj.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#E01A4F] transition-colors"
                          aria-label={`Instagram de ${dj.nome}`}
                        >
                          <Instagram size={20} />
                        </a>
                      )}
                      {dj.soundcloud && (
                        <a
                          href={`https://soundcloud.com/${dj.soundcloud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#FF5500] transition-colors"
                          aria-label={`SoundCloud de ${dj.nome}`}
                        >
                          <Music size={20} />
                        </a>
                      )}
                      <button
                        onClick={() => handleVoteClick(dj)}
                        className="ml-auto btn-brutal bg-[#E01A4F] text-white px-4 py-2 text-sm"
                        data-testid={`profile-vote-btn-${dj.slug}`}
                      >
                        VOTAR
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="eventos" className="py-20 px-4 md:px-8" data-testid="events-section">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-center"
            {...fadeInUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
          >
            PRÓXIMOS <span className="text-[#00FFFF]">EVENTOS</span>
          </motion.h2>
          <p className="text-gray-400 text-center mb-16">Garanta seu ingresso pelo WhatsApp</p>

          <div className="space-y-6">
            {eventos.map((evento, index) => (
              <motion.div
                key={evento.id}
                className="event-card glass border-l-4 border-[#E01A4F] p-6 md:p-8"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`event-card-${evento.id}`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-shrink-0 text-center lg:text-left">
                    <div className="text-5xl md:text-6xl font-bold text-[#00FFFF]">
                      {evento.data.split('/')[0]}
                    </div>
                    <div className="text-xl text-gray-400">
                      {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][parseInt(evento.data.split('/')[1]) - 1]}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">{evento.titulo}</h3>
                    <p className="text-gray-300 mb-4">{evento.descricao}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <Clock size={16} className="text-[#E01A4F]" />
                        {evento.horario}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={16} className="text-[#E01A4F]" />
                        {evento.local}, {evento.cidade}/{evento.estado}
                      </span>
                      <span className="flex items-center gap-1 text-[#25D366] font-bold">
                        {evento.preco}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 flex items-center">
                    <button
                      onClick={() => openWhatsApp(evento.whatsapp_mensagem)}
                      className="whatsapp-btn btn-brutal bg-[#25D366] text-white px-6 py-3 flex items-center gap-2"
                      data-testid={`whatsapp-btn-${evento.id}`}
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      COMPRAR INGRESSO
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog/Articles Section */}
      <section id="blog" className="py-20 px-4 md:px-8 bg-[#0a0a0a]" data-testid="blog-section">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-center"
            {...fadeInUp}
            viewport={{ once: true }}
            whileInView="animate"
            initial="initial"
          >
            CONTEÚDO <span className="text-[#E01A4F]">ELETROFUNK</span>
          </motion.h2>
          <p className="text-gray-400 text-center mb-16">Artigos, dicas e novidades do mundo da cachorrada</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artigos.map((artigo, index) => (
              <motion.article
                key={artigo.id}
                className="blog-card group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`blog-card-${artigo.slug}`}
              >
                <div className="relative h-48 overflow-hidden border border-[#E01A4F]/30">
                  <img
                    src={artigo.imagem || "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?auto=format&fit=crop&w=600&q=80"}
                    alt={artigo.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                  <h3 className="absolute bottom-4 left-4 right-4 text-lg font-bold leading-tight">
                    {artigo.titulo}
                  </h3>
                </div>
                <div className="p-4 glass border border-[#E01A4F]/20 border-t-0">
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{artigo.resumo}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {artigo.keywords?.slice(0, 2).map((kw, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-[#00FFFF]/10 text-[#00FFFF]">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <a
                    href={`/artigo/${artigo.slug}`}
                    className="text-[#E01A4F] text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    LER MAIS <ArrowRight size={14} />
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#E01A4F]/20 to-[#8A2BE2]/20" />
        <motion.div
          className="max-w-4xl mx-auto text-center relative z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            QUER PARTICIPAR DA <span className="text-[#00FFFF]">CACHORRADA</span>?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Entre em contato pelo WhatsApp para saber mais sobre eventos, parcerias ou para incluir seu DJ no ranking!
          </p>
          <button
            onClick={() => openWhatsApp("Olá! Vim pelo site Eletrofunk Cachorrada e quero saber mais!")}
            className="whatsapp-btn btn-brutal bg-[#25D366] text-white px-8 py-4 text-lg inline-flex items-center gap-2"
            data-testid="cta-whatsapp-btn"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            FALAR NO WHATSAPP
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-8 bg-[#050505] border-t border-[#E01A4F]/20" data-testid="footer">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <img src={LOGO_URL} alt="Eletrofunk Cachorrada" className="w-32 mb-4" />
              <p className="text-gray-400 text-sm">
                O portal definitivo da cachorrada eletrônica e eletrofunk pesado do Brasil.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4 text-[#00FFFF]">NAVEGAÇÃO</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('votacao')} className="footer-link text-sm">Votação</button></li>
                <li><button onClick={() => scrollToSection('djs')} className="footer-link text-sm">DJs</button></li>
                <li><button onClick={() => scrollToSection('eventos')} className="footer-link text-sm">Eventos</button></li>
                <li><button onClick={() => scrollToSection('blog')} className="footer-link text-sm">Blog</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4 text-[#00FFFF]">CONTATO</h4>
              <div className="space-y-2">
                <a
                  href={`https://instagram.com/jonatasbeirao`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 footer-link text-sm"
                  data-testid="instagram-link"
                >
                  <Instagram size={16} />
                  @jonatasbeirao
                </a>
                <button
                  onClick={() => openWhatsApp()}
                  className="flex items-center gap-2 footer-link text-sm"
                  data-testid="footer-whatsapp"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  +55 21 97223-2170
                </button>
              </div>
            </div>
          </div>
          
          <div className="section-divider mb-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>
              © 2025 Sucesso Vip Empreendimentos | CNPJ: 21.534.683/0001-37
            </p>
            <p>
              Cachorrada eletrônica | Eletrofunk | Funk rave brasileiro
            </p>
          </div>
        </div>
      </footer>

      {/* Vote Modal */}
      <AnimatePresence>
        {showVoteModal && selectedDj && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVoteModal(false)}
            data-testid="vote-modal"
          >
            <motion.div
              className="w-full max-w-md glass border border-[#E01A4F] p-6 md:p-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-2 text-center">
                VOTAR EM <span className="text-[#00FFFF]">{selectedDj.nome}</span>
              </h3>
              <p className="text-gray-400 text-sm text-center mb-6">
                Preencha seus dados para registrar seu voto
              </p>
              
              <form onSubmit={handleVoteSubmit} className="voting-form space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nome completo</label>
                  <input
                    type="text"
                    required
                    value={voteForm.nome}
                    onChange={(e) => setVoteForm({ ...voteForm, nome: e.target.value })}
                    className="w-full"
                    placeholder="Seu nome"
                    data-testid="vote-input-nome"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    value={voteForm.cpf}
                    onChange={(e) => setVoteForm({ ...voteForm, cpf: formatCPF(e.target.value) })}
                    className="w-full"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    data-testid="vote-input-cpf"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={voteForm.email}
                    onChange={(e) => setVoteForm({ ...voteForm, email: e.target.value })}
                    className="w-full"
                    placeholder="seu@email.com"
                    data-testid="vote-input-email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={voteForm.whatsapp}
                    onChange={(e) => setVoteForm({ ...voteForm, whatsapp: formatPhone(e.target.value) })}
                    className="w-full"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    data-testid="vote-input-whatsapp"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Estado</label>
                  <select
                    required
                    value={voteForm.estado}
                    onChange={(e) => setVoteForm({ ...voteForm, estado: e.target.value })}
                    className="w-full"
                    data-testid="vote-input-estado"
                  >
                    <option value="">Selecione seu estado</option>
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVoteModal(false)}
                    className="btn-brutal flex-1 bg-transparent border border-gray-600 text-gray-300 py-3"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-brutal flex-1 bg-[#E01A4F] text-white py-3 disabled:opacity-50"
                    data-testid="vote-submit-btn"
                  >
                    {isSubmitting ? "VOTANDO..." : "CONFIRMAR VOTO"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
