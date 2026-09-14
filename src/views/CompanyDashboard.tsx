import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Users,
  Film,
  Image as ImageIcon,
  Rss,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  Power,
  ExternalLink,
  UploadCloud,
  Clock,
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoveUp,
  MoveDown,
  Tv,
  Smartphone,
  CloudSun,
  HardDrive,
  FileUp,
  FileText,
  X,
  RefreshCw,
  Newspaper,
  Search,
  Check,
  Layers,
  Sparkles,
  Folder,
  Camera,
  Link2,
  Copy,
  QrCode,
} from 'lucide-react';
import { api } from '../lib/api';
import { CompanyStats, Player, Operator, Playlist, Media, RssFeed, Company, DriveDocument } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { GoogleDriveFileManager } from '../components/GoogleDriveFileManager';
import {
  ensureClientFolders,
  uploadFileToDrive,
  getCachedToken,
  requestGoogleLogin,
} from '../lib/googleDrive';

interface CompanyDashboardProps {
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenPlayerSimulation: (code: string) => void;
  companyInfo?: { id: string; name: string } | null;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  showToast,
  onOpenPlayerSimulation,
  companyInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'operators' | 'playlists' | 'media' | 'rss' | 'files'>('dashboard');
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [rssList, setRssList] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [rssModalOpen, setRssModalOpen] = useState(false);
  const [editingRss, setEditingRss] = useState<RssFeed | null>(null);

  const [resetPasswordData, setResetPasswordData] = useState<{
    isOpen: boolean;
    type: 'player' | 'operator';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'player',
    id: '',
    title: '',
  });
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Unique Direct Access Player Link Modal & copy state
  const [playerDirectLinkModal, setPlayerDirectLinkModal] = useState<{
    isOpen: boolean;
    player: Player | null;
  }>({
    isOpen: false,
    player: null,
  });
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null);

  // Forms
  const [playerForm, setPlayerForm] = useState<{
    name: string;
    code: string;
    location: string;
    description: string;
    orientation: 'horizontal' | 'vertical';
    playlist_id: string;
    password: string;
  }>({
    name: '',
    code: '',
    location: '',
    description: '',
    orientation: 'horizontal',
    playlist_id: '',
    password: '',
  });

  const [operatorForm, setOperatorForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [playlistForm, setPlaylistForm] = useState<{
    name: string;
    description: string;
    weather_city: string;
    items: Array<{
      media_id: string;
      duration: number | string;
    }>;
  }>({
    name: '',
    description: '',
    weather_city: '',
    items: [],
  });

  // Media Picker modal states for Playlist
  const [mediaPickerModalOpen, setMediaPickerModalOpen] = useState(false);
  const [mediaPickerFilter, setMediaPickerFilter] = useState<'all' | 'image' | 'video' | 'rss' | 'weather_clock'>('all');
  const [mediaPickerSearch, setMediaPickerSearch] = useState('');

  const [mediaForm, setMediaForm] = useState<{
    name: string;
    type: 'image' | 'video' | 'rss' | 'weather_clock';
    file_url: string;
    duration: number | string;
  }>({
    name: '',
    type: 'image',
    file_url: '',
    duration: 10,
  });

  const [mediaSourceType, setMediaSourceType] = useState<
    'device' | 'url' | 'rss' | 'weather_clock' | 'drive'
  >('device');
  const [driveMediaTab, setDriveMediaTab] = useState<'select' | 'upload'>('select');
  const [companyDriveDocs, setCompanyDriveDocs] = useState<DriveDocument[]>([]);
  const [selectedDriveDocId, setSelectedDriveDocId] = useState<string>('');
  const [driveUploadFile, setDriveUploadFile] = useState<File | null>(null);
  const [driveUploadPreview, setDriveUploadPreview] = useState<string | null>(null);
  const [isLoadingDriveDocs, setIsLoadingDriveDocs] = useState(false);
  const driveFileInputRef = useRef<HTMLInputElement>(null);

  const loadCompanyDriveDocs = async () => {
    try {
      setIsLoadingDriveDocs(true);
      const res = await api.getDriveDocuments({
        companyId: companyInfo?.id,
      });
      if (res.documents) {
        setCompanyDriveDocs(res.documents);
      }
    } catch (e) {
      console.warn('Could not load company drive docs:', e);
    } finally {
      setIsLoadingDriveDocs(false);
    }
  };

  const [selectedDeviceFile, setSelectedDeviceFile] = useState<{
    file: File | null;
    dataUrl: string;
    name: string;
    sizeFormatted: string;
    type: string;
    isVideo: boolean;
  } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const resetMediaModalState = () => {
    setMediaForm({
      name: '',
      type: 'image',
      file_url: '',
      duration: 10,
    });
    setMediaSourceType('device');
    setSelectedDeviceFile(null);
    setSelectedDriveDocId('');
    setDriveUploadFile(null);
    setDriveUploadPreview(null);
    setIsUploadingMedia(false);
    setIsDraggingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (driveFileInputRef.current) {
      driveFileInputRef.current.value = '';
    }
  };

  const [rssForm, setRssForm] = useState({
    name: '',
    url: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, pl, op, py, md, rs] = await Promise.all([
        api.getCompanyStats(),
        api.getCompanyPlayers(),
        api.getCompanyOperators(),
        api.getCompanyPlaylists(),
        api.getCompanyMedia(),
        api.getCompanyRss(),
      ]);
      setStats(s);
      setPlayers(pl);
      setOperators(op);
      setPlaylists(py);
      setMediaList(md);
      setRssList(rs);
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao carregar dados da empresa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh stats and player status periodically
    const interval = setInterval(() => {
      api.getCompanyPlayers().then(setPlayers).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- PLAYER HANDLERS ---
  const handleOpenPlayerModal = (player?: Player) => {
    if (player) {
      setEditingPlayer(player);
      setPlayerForm({
        name: player.name,
        code: player.code,
        location: player.location || '',
        description: player.description || '',
        orientation: player.orientation || 'horizontal',
        playlist_id: player.playlist_id || '',
        password: '',
      });
    } else {
      setEditingPlayer(null);
      const nextCode = `PLAY-0${players.length + 1}`;
      setPlayerForm({
        name: '',
        code: nextCode,
        location: '',
        description: '',
        orientation: 'horizontal',
        playlist_id: playlists[0]?.id || '',
        password: '',
      });
    }
    setPlayerModalOpen(true);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await api.updateCompanyPlayer(editingPlayer.id, playerForm);
        showToast('success', 'Player atualizado com sucesso.');
      } else {
        await api.createCompanyPlayer(playerForm);
        showToast('success', 'Player cadastrado com sucesso.');
      }
      setPlayerModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleTogglePlayer = (player: Player) => {
    const isActivating = player.status === 'inactive';
    setConfirmData({
      isOpen: true,
      title: isActivating ? 'Ativar Player' : 'Desativar Player',
      message: isActivating
        ? `Deseja ativar o player ${player.name}?`
        : `Deseja desativar o player ${player.name}? Ele não reproduzirá conteúdos enquanto inativo.`,
      action: async () => {
        try {
          const res = await api.togglePlayerStatus(player.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  const handleDeletePlayer = (player: Player) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Player',
      message: `Tem certeza que deseja excluir o player ${player.name} (${player.code})?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyPlayer(player.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  const getPlayerDirectUrl = (player: Player) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const token = player.access_token || player.code;
    return `${origin}/?player=${encodeURIComponent(player.code)}&token=${encodeURIComponent(token)}`;
  };

  const handleCopyPlayerLink = async (player: Player) => {
    const url = getPlayerDirectUrl(player);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedPlayerId(player.id);
      setTimeout(() => setCopiedPlayerId(null), 3000);
      showToast(
        'success',
        `Link único do player "${player.name}" copiado! Coloque esse link como atalho no aparelho para inicialização automática instantânea.`
      );
    } catch {
      showToast('error', 'Não foi possível copiar automaticamente para a área de transferência.');
    }
  };

  const handleRegenerateToken = async (player: Player) => {
    try {
      const res = await api.regeneratePlayerToken(player.id);
      showToast('success', 'Novo token de acesso gerado com sucesso.');
      if (playerDirectLinkModal.player?.id === player.id) {
        setPlayerDirectLinkModal({
          isOpen: true,
          player: { ...player, access_token: res.access_token },
        });
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // --- OPERATOR HANDLERS ---
  const handleOpenOperatorModal = (operator?: Operator) => {
    if (operator) {
      setEditingOperator(operator);
      setOperatorForm({
        name: operator.name,
        email: operator.email,
        phone: operator.phone || '',
        password: '',
      });
    } else {
      if (stats.limits.max_operators === 0) {
        showToast('error', 'Seu plano atual é exclusivo para exibição de mídia e notícias RSS (sem operador). Solicite alteração para a Linha Call para habilitar operadores.');
        return;
      }
      setEditingOperator(null);
      setOperatorForm({
        name: '',
        email: '',
        phone: '',
        password: '',
      });
    }
    setOperatorModalOpen(true);
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOperator) {
        await api.updateCompanyOperator(editingOperator.id, operatorForm);
        showToast('success', 'Operador atualizado com sucesso.');
      } else {
        await api.createCompanyOperator(operatorForm);
        showToast('success', 'Operador cadastrado com sucesso.');
      }
      setOperatorModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleToggleOperator = async (operator: Operator) => {
    try {
      const res = await api.toggleOperatorStatus(operator.id);
      showToast('success', res.message);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteOperator = (operator: Operator) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Operador',
      message: `Tem certeza que deseja excluir o operador ${operator.name}?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyOperator(operator.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // --- PLAYLIST HANDLERS ---
  const handleOpenPlaylistModal = (playlist?: Playlist) => {
    if (playlist) {
      setEditingPlaylist(playlist);
      setPlaylistForm({
        name: playlist.name,
        description: playlist.description || '',
        weather_city: playlist.weather_city || '',
        items: playlist.items.map((it) => ({
          media_id: it.media_id,
          duration: it.duration || 10,
        })),
      });
    } else {
      setEditingPlaylist(null);
      setPlaylistForm({
        name: '',
        description: '',
        weather_city: '',
        items: mediaList.slice(0, 2).map((m) => ({ media_id: m.id, duration: m.duration || 10 })),
      });
    }
    setPlaylistModalOpen(true);
  };

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...playlistForm,
        items: playlistForm.items.map((it, idx) => ({
          media_id: it.media_id,
          position: idx + 1,
          duration: Number(it.duration) || 10,
        })),
      };
      if (editingPlaylist) {
        await api.updateCompanyPlaylist(editingPlaylist.id, payload as any);
        showToast('success', 'Playlist atualizada com sucesso.');
      } else {
        await api.createCompanyPlaylist(payload as any);
        showToast('success', 'Playlist criada com sucesso.');
      }
      setPlaylistModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleSelectMediaForPlaylist = (media: Media) => {
    setPlaylistForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          media_id: media.id,
          duration: media.duration || (media.type === 'rss' ? 15 : 10),
        },
      ],
    }));
    showToast('success', `Mídia "${media.name}" incluída na playlist.`);
    setMediaPickerModalOpen(false);
  };

  const handleTogglePlaylist = async (playlist: Playlist) => {
    try {
      const res = await api.togglePlaylistStatus(playlist.id);
      showToast('success', res.message);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Playlist',
      message: `Tem certeza que deseja excluir a playlist ${playlist.name}?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyPlaylist(playlist.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // --- MEDIA HANDLERS ---
  const handleProcessDeviceFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      showToast('error', 'O arquivo é muito grande. O limite máximo é de 50 MB.');
      return;
    }

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);

    if (!isVideo && !isImage) {
      showToast('error', 'Formato não suportado. Escolha uma imagem (JPG, PNG, WEBP, GIF) ou vídeo (MP4, WebM, MOV).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedDeviceFile({
        file,
        dataUrl,
        name: file.name,
        sizeFormatted: formatFileSize(file.size),
        type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        isVideo,
      });

      const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setMediaForm((prev) => ({
        ...prev,
        name: prev.name.trim() === '' ? autoTitle : prev.name,
        type: isVideo ? 'video' : 'image',
        duration: isVideo ? 15 : prev.duration || 10,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUploadingMedia(true);
      let targetFileUrl = mediaForm.file_url;

      if (mediaSourceType === 'device') {
        if (!selectedDeviceFile) {
          showToast('error', 'Por favor, selecione um arquivo de mídia do seu dispositivo.');
          setIsUploadingMedia(false);
          return;
        }

        // Upload file directly to server
        const uploadRes = await api.uploadFile(
          selectedDeviceFile.dataUrl,
          selectedDeviceFile.name,
          selectedDeviceFile.type
        );
        targetFileUrl = uploadRes.url;
      } else if (mediaSourceType === 'drive') {
        if (driveMediaTab === 'select') {
          if (!selectedDriveDocId) {
            showToast('error', 'Selecione um arquivo ou foto da lista do Google Drive.');
            setIsUploadingMedia(false);
            return;
          }
          const chosenDoc = companyDriveDocs.find((d) => d.id === selectedDriveDocId);
          if (!chosenDoc) {
            showToast('error', 'Arquivo não encontrado no Google Drive.');
            setIsUploadingMedia(false);
            return;
          }
          targetFileUrl = chosenDoc.drive_view_url || chosenDoc.drive_download_url;
          if (!mediaForm.name.trim()) {
            mediaForm.name = chosenDoc.title;
          }
        } else {
          // Upload directly to Drive & link as Media
          if (!driveUploadFile) {
            showToast('error', 'Selecione uma foto ou arquivo para enviar ao Google Drive.');
            setIsUploadingMedia(false);
            return;
          }

          const token = getCachedToken();
          if (!token) {
            showToast('error', 'Conecte sua conta do Google Drive para autorizar o envio.');
            requestGoogleLogin();
            setIsUploadingMedia(false);
            return;
          }

          const clientName = companyInfo?.name || 'Cliente';
          const structure = await ensureClientFolders(token, clientName);
          const isPhoto = driveUploadFile.type.startsWith('image/');
          const targetFolder = isPhoto
            ? structure.categoryFolders.photos
            : structure.categoryFolders.documents;
          const prefix = isPhoto ? 'FOTO' : 'DOC';
          const randHash = Math.random().toString(36).substring(2, 6).toUpperCase();
          const cliCode = clientName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'CLI');
          const uniqueCode = `${prefix}-${cliCode}-${randHash}`;
          const sanitizedFileName = `${uniqueCode}_${driveUploadFile.name.replace(/\s+/g, '_')}`;

          const uploadRes = await uploadFileToDrive(
            token,
            driveUploadFile,
            sanitizedFileName,
            targetFolder.id,
            {
              description: `Arquivo enviado via painel de mídia (${uniqueCode})`,
              uniqueCode,
            }
          );

          await api.createDriveDocument({
            unique_code: uniqueCode,
            company_id: companyInfo?.id || '',
            category: isPhoto ? 'photo' : 'document',
            title: mediaForm.name.trim() || driveUploadFile.name,
            description: `Foto de exibição enviada via formulário com código ${uniqueCode}`,
            file_name: driveUploadFile.name,
            file_size: driveUploadFile.size,
            mime_type: driveUploadFile.type,
            drive_file_id: uploadRes.id,
            drive_folder_id: targetFolder.id,
            drive_view_url: uploadRes.webViewLink,
            drive_download_url: uploadRes.webContentLink,
            status: 'completed',
          });

          targetFileUrl = uploadRes.webViewLink;
        }
      } else if (mediaSourceType === 'weather_clock') {
        targetFileUrl = 'widget:weather_clock';
      } else if (mediaSourceType === 'rss') {
        if (!targetFileUrl.trim()) {
          showToast('error', 'Informe a URL do feed RSS.');
          setIsUploadingMedia(false);
          return;
        }
      } else {
        if (!targetFileUrl.trim()) {
          showToast('error', 'Informe a URL da mídia.');
          setIsUploadingMedia(false);
          return;
        }
      }

      await api.uploadCompanyMedia({
        name: mediaForm.name.trim() || (mediaSourceType === 'rss' ? 'Notícias RSS' : 'Nova Mídia'),
        type: mediaSourceType === 'weather_clock' ? 'weather_clock' : mediaSourceType === 'rss' ? 'rss' : mediaForm.type,
        file_url: targetFileUrl,
        duration: Number(mediaForm.duration) || 10,
      });

      showToast(
        'success',
        mediaSourceType === 'device'
          ? 'Mídia carregada diretamente do dispositivo com sucesso!'
          : mediaSourceType === 'drive'
          ? 'Foto/Arquivo vinculado do Google Drive com sucesso!'
          : mediaSourceType === 'rss'
          ? 'Mídia de Notícias RSS em Tela Inteira cadastrada com sucesso!'
          : 'Mídia cadastrada com sucesso.'
      );
      setMediaModalOpen(false);
      resetMediaModalState();
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao cadastrar mídia.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleDeleteMedia = (media: Media) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Mídia',
      message: `Tem certeza que deseja excluir a mídia "${media.name}"?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyMedia(media.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // Sample media templates for quick testing
  const addPresetMedia = (title: string, type: 'image' | 'video' | 'rss' | 'weather_clock', url: string, duration: number) => {
    setSelectedDeviceFile(null);
    setMediaSourceType(type === 'weather_clock' ? 'weather_clock' : type === 'rss' ? 'rss' : 'url');
    setMediaForm({
      name: title,
      type,
      file_url: url,
      duration,
    });
  };

  // --- RSS HANDLERS ---
  const [isLoadingDefaultRss, setIsLoadingDefaultRss] = useState(false);

  const RSS_PRESETS = [
    {
      name: 'G1 - Saúde e Bem-Estar',
      url: 'https://g1.globo.com/rss/g1/saude/',
      category: 'Saúde',
      description: 'Prevenção, medicina e qualidade de vida.',
    },
    {
      name: 'G1 - Brasil e Notícias Gerais',
      url: 'https://g1.globo.com/rss/g1/brasil/',
      category: 'Geral',
      description: 'Manchetes e notícias do Brasil em tempo real.',
    },
    {
      name: 'Folha de S.Paulo - Em Cima da Hora',
      url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',
      category: 'Jornalismo',
      description: 'Atualizações minuto a minuto dos principais fatos.',
    },
    {
      name: 'G1 - Economia e Negócios',
      url: 'https://g1.globo.com/rss/g1/economia/',
      category: 'Economia',
      description: 'Mercado financeiro, finanças pessoais e inflação.',
    },
    {
      name: 'G1 - Tecnologia e Inovação',
      url: 'https://g1.globo.com/rss/g1/tecnologia/',
      category: 'Tecnologia',
      description: 'Inovações, smartphones, IA e mundo digital.',
    },
  ];

  const handleLoadDefaultRss = async () => {
    setIsLoadingDefaultRss(true);
    try {
      const res = await api.loadDefaultRssFeeds();
      showToast('success', res.message || 'Canais RSS recomendados carregados com sucesso!');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao carregar canais padrão.');
    } finally {
      setIsLoadingDefaultRss(false);
    }
  };

  const handleAddPresetRss = async (preset: { name: string; url: string }) => {
    try {
      await api.createCompanyRss(preset);
      showToast('success', `Canal "${preset.name}" adicionado com sucesso!`);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao adicionar canal.');
    }
  };

  const handleOpenRssModal = (rss?: RssFeed) => {
    if (rss) {
      setEditingRss(rss);
      setRssForm({ name: rss.name, url: rss.url });
    } else {
      setEditingRss(null);
      setRssForm({ name: '', url: 'https://g1.globo.com/rss/g1/brasil/' });
    }
    setRssModalOpen(true);
  };

  const handleSaveRss = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRss) {
        await api.updateCompanyRss(editingRss.id, rssForm);
        showToast('success', 'Feed RSS atualizado.');
      } else {
        await api.createCompanyRss(rssForm);
        showToast('success', 'Feed RSS cadastrado.');
      }
      setRssModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleToggleRss = async (rss: RssFeed) => {
    try {
      const res = await api.toggleRssStatus(rss.id);
      showToast('success', res.message);
      loadData();
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleDeleteRss = (rss: RssFeed) => {
    setConfirmData({
      isOpen: true,
      title: 'Excluir Feed RSS',
      message: `Tem certeza que deseja remover o feed "${rss.name}"?`,
      action: async () => {
        try {
          const res = await api.deleteCompanyRss(rss.id);
          showToast('success', res.message);
          setConfirmData((p) => ({ ...p, isOpen: false }));
          loadData();
        } catch (err: any) {
          showToast('error', err.message);
        }
      },
    });
  };

  // --- PASSWORD RESET HANDLER ---
  const handlePerformPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (resetPasswordData.type === 'player') {
        const res = await api.resetPlayerPassword(resetPasswordData.id, newPasswordInput || undefined);
        showToast('success', res.message);
      } else {
        const res = await api.resetOperatorPassword(resetPasswordData.id, newPasswordInput || undefined);
        showToast('success', res.message);
      }
      setResetPasswordData((p) => ({ ...p, isOpen: false }));
      setNewPasswordInput('');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const filteredPickerMedia = mediaList.filter((m) => {
    const matchesFilter =
      mediaPickerFilter === 'all' ? true : m.type === mediaPickerFilter;
    const matchesSearch =
      mediaPickerSearch.trim() === '' ||
      m.name.toLowerCase().includes(mediaPickerSearch.toLowerCase()) ||
      m.type.toLowerCase().includes(mediaPickerSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700 pb-5 mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight uppercase">Painel da Empresa</h2>
          <p className="text-xs text-slate-400 mt-0.5 tracking-wider">Gestão de players, operadores, playlists e mídias</p>
        </div>

        {/* Scrollable sub-tabs for mobile touch */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'players'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('operators')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'operators'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Operadores ({operators.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'media'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            Mídias ({mediaList.length})
          </button>
          <button
            onClick={() => setActiveTab('rss')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'rss'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            RSS ({rssList.length})
          </button>
          <button
            id="tab-company-files"
            onClick={() => setActiveTab('files')}
            className={`shrink-0 whitespace-nowrap min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'files'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Drive / Arquivos</span>
          </button>
        </div>
      </div>

      {/* VIEW: DASHBOARD MINIMALISTA COM LIMITES DO PLANO */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-8">
          {/* 4 Cards de Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Players Ativos
                </span>
                <Monitor className="h-4 w-4 text-blue-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">
                {stats.activePlayersCount}{' '}
                <span className="text-xs font-normal text-slate-400">/ {stats.playersCount} total</span>
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium">{stats.onlinePlayersCount} online no momento</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Operadores
                </span>
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">{stats.operatorsCount}</p>
              <p className="mt-2 text-xs text-slate-400">Atendentes autorizados</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Playlists
                </span>
                <Film className="h-4 w-4 text-purple-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">{stats.playlistsCount}</p>
              <p className="mt-2 text-xs text-slate-400">Grades de reprodução</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Mídias Cadastradas
                </span>
                <ImageIcon className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white tracking-tight">{stats.mediaCount}</p>
              <p className="mt-2 text-xs text-slate-400">Imagens e vídeos</p>
            </div>
          </div>

          {/* Resumo dos Limites do Plano */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Limites do Plano: {stats.plan?.name || 'Plano Personalizado'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consumo em tempo real em relação à cota máxima contratada
                </p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800/80">
                R$ {Number(stats.plan?.monthly_price || 0).toFixed(2)}/mês
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Players limit */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Players Utilizados</span>
                  <span className="font-semibold text-white">
                    {stats.playersCount} / {stats.limits.max_players}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (stats.playersCount / stats.limits.max_players) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Operators limit */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Operadores de Atendimento</span>
                  <span className="font-semibold text-white">
                    {stats.limits.max_operators === 0 ? (
                      <span className="text-amber-400 font-bold text-[10px] uppercase">Não incluído (Linha Show)</span>
                    ) : (
                      `${stats.operatorsCount} / ${stats.limits.max_operators}`
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stats.limits.max_operators === 0 ? 'bg-amber-500/30' : 'bg-emerald-500'}`}
                    style={{
                      width: stats.limits.max_operators === 0 ? '0%' : `${Math.min(100, (stats.operatorsCount / Math.max(1, stats.limits.max_operators)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Storage limit */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Mídias em Armazenamento</span>
                  <span className="font-semibold text-white">
                    {stats.mediaCount} / {stats.limits.max_storage}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (stats.mediaCount / stats.limits.max_storage) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: PLAYERS */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Players de Mídia</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pontos de exibição instalados em TVs e monitores</p>
            </div>
            <button
              onClick={() => handleOpenPlayerModal()}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Player</span>
            </button>
          </div>

          {/* MOBILE CARDS VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {players.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400 text-xs">
                Nenhum player cadastrado. Clique em "Novo Player" para adicionar uma tela.
              </div>
            ) : (
              players.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{p.description || 'Sem descrição'}</p>
                    </div>
                    <span className="font-mono bg-slate-900 px-2.5 py-1 rounded text-xs font-bold text-blue-400 border border-slate-700 shrink-0">
                      {p.code}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Status & Online */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.is_online
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          p.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      {p.is_online ? 'Online' : 'Offline'}
                    </span>

                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'active'
                          ? 'bg-blue-950/60 text-blue-300 border border-blue-800'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {p.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>

                    {/* Orientation */}
                    {p.orientation === 'vertical' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                        <Smartphone className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span>9:16 Vertical</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-950/60 text-blue-300 border border-blue-800/80">
                        <Tv className="h-3 w-3 text-blue-400 shrink-0" />
                        <span>16:9 Horizontal</span>
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-700/60 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Localização:</span>
                      <span className="font-medium text-slate-200">{p.location || 'Não informada'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Playlist:</span>
                      <span className="font-medium text-blue-400">{p.playlist_name || 'Nenhuma'}</span>
                    </div>
                  </div>

                  {/* Link Único / Atalho TV */}
                  <div className="rounded-lg bg-blue-950/40 p-2.5 border border-blue-800/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                        <Link2 className="h-3 w-3 text-blue-400" />
                        <span>Link Único (Sem Login)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPlayerDirectLinkModal({ isOpen: true, player: p })}
                        className="text-[10px] text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-300 font-mono truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-700/60 select-all">
                      {getPlayerDirectUrl(p)}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCopyPlayerLink(p)}
                        className={`flex-1 min-h-[36px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                          copiedPlayerId === p.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {copiedPlayerId === p.id ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Link Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copiar Link Único</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(getPlayerDirectUrl(p), '_blank')}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Abrir em Nova Aba"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Abrir</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions Grid for Mobile */}
                  <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenPlayerSimulation(p.code)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 text-xs font-semibold cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Ver Tela</span>
                    </button>
                    <button
                      onClick={() => handleOpenPlayerModal(p)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        setResetPasswordData({
                          isOpen: true,
                          type: 'player',
                          id: p.id,
                          title: `Resetar Senha do Player ${p.name}`,
                        });
                      }}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-800/60 text-xs font-semibold cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Senha</span>
                    </button>
                    <button
                      onClick={() => handleTogglePlayer(p)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{p.status === 'active' ? 'Desativar' : 'Ativar'}</span>
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(p)}
                      className="col-span-2 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir Player</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800 uppercase font-bold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Identificação / Nome</th>
                  <th className="px-5 py-3.5">Código Único</th>
                  <th className="px-5 py-3.5">Link Único (Atalho Direto)</th>
                  <th className="px-5 py-3.5">Formato & Resolução</th>
                  <th className="px-5 py-3.5">Localização</th>
                  <th className="px-5 py-3.5">Playlist Associada</th>
                  <th className="px-5 py-3.5">Conexão</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                      Nenhum player cadastrado. Clique em "Novo Player" para adicionar uma tela.
                    </td>
                  </tr>
                ) : (
                  players.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white text-sm">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.description || 'Sem descrição'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono bg-slate-900 px-2.5 py-1 rounded text-xs font-bold text-blue-400 border border-slate-700">
                          {p.code}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyPlayerLink(p)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition shadow-xs ${
                              copiedPlayerId === p.id
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                : 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border-blue-800/80'
                            }`}
                            title="Copiar link único com token para atalho na TV/Aparelho"
                          >
                            {copiedPlayerId === p.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-300 font-bold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-blue-400" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlayerDirectLinkModal({ isOpen: true, player: p })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Ver detalhes do link único e QR Code"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {p.orientation === 'vertical' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                            <Smartphone className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span>9:16 (1080×1920) Vertical</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-950/60 text-blue-300 border border-blue-800/80">
                            <Tv className="h-3 w-3 text-blue-400 shrink-0" />
                            <span>16:9 (1920×1080) Horizontal</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-200">{p.location || 'Não informada'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded bg-slate-900/80 px-2.5 py-1 text-slate-300 border border-slate-700 text-xs">
                          {p.playlist_name || 'Nenhuma'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.is_online
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              p.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          {p.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'active'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-800'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {p.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de abrir em nova aba pelo link único */}
                          <button
                            onClick={() => window.open(getPlayerDirectUrl(p), '_blank')}
                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Abrir reprodutor pelo link único (Nova Aba)"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          {/* Botão de simular no mesmo app */}
                          <button
                            onClick={() => onOpenPlayerSimulation(p.code)}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Simular visualização"
                          >
                            <Tv className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPlayerModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordData({
                                isOpen: true,
                                type: 'player',
                                id: p.id,
                                title: `Resetar Senha do Player ${p.name}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Resetar senha"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleTogglePlayer(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title={p.status === 'active' ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(p)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: OPERADORES */}
      {activeTab === 'operators' && (
        <div className="space-y-6">
          {stats.limits.max_operators === 0 && (
            <div className="rounded-xl border border-amber-800/80 bg-amber-950/40 p-4 text-amber-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-900/60 p-2 text-amber-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-100">
                    Plano de Exibição / Sem Operador ({stats.plan?.name || 'Linha Show'})
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                    Este plano foi configurado exclusivamente para transmissão de mídias institucionais, propagandas, previsão do tempo, relógio e notícias RSS na tela sem chamadas de guichê. Caso necessite chamar senhas ou clientes, solicite a alteração para um dos planos da <strong>Linha Call</strong> (com 4 operadores por tela).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Operadores de Atendimento</h3>
              <p className="text-xs text-slate-400 mt-0.5">Usuários autorizados a realizar chamadas nos players</p>
            </div>
            <button
              onClick={() => handleOpenOperatorModal()}
              disabled={stats.limits.max_operators === 0}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider shadow-sm transition w-full sm:w-auto ${
                stats.limits.max_operators === 0
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                  : 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
              }`}
              title={stats.limits.max_operators === 0 ? 'Plano sem operadores' : 'Cadastrar novo operador'}
            >
              <Plus className="h-4 w-4" />
              <span>Novo Operador</span>
            </button>
          </div>

          {/* MOBILE CARDS VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {operators.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400 text-xs">
                Nenhum operador cadastrado. Clique em "Novo Operador".
              </div>
            ) : (
              operators.map((op) => (
                <div key={op.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{op.name}</h4>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">{op.email}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        op.active
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${op.active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {op.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-700/60 text-xs">
                    <span className="text-slate-400">Telefone: </span>
                    <span className="font-medium text-slate-200">{op.phone || 'Não informado'}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenOperatorModal(op)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        setResetPasswordData({
                          isOpen: true,
                          type: 'operator',
                          id: op.id,
                          title: `Resetar Senha do Operador ${op.name}`,
                        });
                      }}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-800/60 text-xs font-semibold cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Senha</span>
                    </button>
                    <button
                      onClick={() => handleToggleOperator(op)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{op.active ? 'Desativar' : 'Ativar'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteOperator(op)}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800 uppercase font-bold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nome</th>
                  <th className="px-5 py-3.5">E-mail de Acesso</th>
                  <th className="px-5 py-3.5">Telefone</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {operators.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      Nenhum operador cadastrado. Clique em "Novo Operador".
                    </td>
                  </tr>
                ) : (
                  operators.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4 font-bold text-white text-sm">{op.name}</td>
                      <td className="px-5 py-4 text-slate-300 font-mono">{op.email}</td>
                      <td className="px-5 py-4 text-slate-300">{op.phone || 'Não informado'}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            op.active
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${op.active ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          />
                          {op.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenOperatorModal(op)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordData({
                                isOpen: true,
                                type: 'operator',
                                id: op.id,
                                title: `Resetar Senha do Operador ${op.name}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Resetar senha"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleOperator(op)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title={op.active ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOperator(op)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: PLAYLISTS */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Playlists de Exibição</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monte grades de conteúdo e ordene a reprodução</p>
            </div>
            <button
              onClick={() => handleOpenPlaylistModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {playlists.length === 0 ? (
              <div className="col-span-2 rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400 text-xs">
                Nenhuma playlist cadastrada.
              </div>
            ) : (
              playlists.map((pl) => (
                <div key={pl.id} className="rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{pl.name}</h4>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border tracking-wider ${
                            pl.active
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          {pl.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{pl.description || 'Sem descrição'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-sky-300 bg-sky-950/70 border border-sky-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
                          🌤️ Clima: {pl.weather_city || 'São Paulo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPlaylistModal(pl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                        title="Editar playlist"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePlaylist(pl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                        title={pl.active ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(pl)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Itens da Playlist */}
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Sequência ({pl.items.length} itens):
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
                      {pl.items.map((it, idx) => (
                        <div
                          key={it.id || idx}
                          className="flex items-center justify-between rounded-lg bg-slate-900/70 border border-slate-700/60 px-3 py-2 text-slate-300"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-slate-500 font-bold">{idx + 1}.</span>
                            <span className="truncate text-white font-medium">{it.name || 'Mídia'}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              ({it.type === 'weather_clock' ? 'CLIMA & HORA' : it.type})
                            </span>
                          </div>
                          <span className="shrink-0 font-mono text-xs text-blue-400 font-bold">
                            {it.duration}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW: MÍDIAS */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Biblioteca de Mídias</h3>
              <p className="text-xs text-slate-400 mt-0.5">Imagens, Vídeos e Mídia de Clima com Hora Certa</p>
            </div>
            <button
              onClick={() => {
                resetMediaModalState();
                setMediaModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Cadastrar Mídia</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {mediaList.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {m.type === 'weather_clock' ? (
                    <div className="h-full w-full bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 p-3 flex flex-col justify-between border-b border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs font-mono font-bold text-white">12:30:00</span>
                        </div>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">Hora Certa</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <CloudSun className="h-5 w-5 text-amber-400" />
                          <div>
                            <span className="text-sm font-bold text-white block leading-none">24°C</span>
                            <span className="text-[9px] text-slate-400 leading-none">Previsão</span>
                          </div>
                        </div>
                        <div className="text-right text-[9px] text-slate-400 font-mono">
                          <span>Máx 28° / Mín 19°</span>
                        </div>
                      </div>
                    </div>
                  ) : m.type === 'rss' ? (
                    <div className="h-full w-full bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 p-3.5 flex flex-col justify-between border-b border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <div className="flex items-center gap-1.5 text-rose-400">
                          <Newspaper className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Feed RSS</span>
                        </div>
                        <span className="text-[9px] font-bold bg-rose-900/60 text-rose-200 px-1.5 py-0.5 rounded border border-rose-700/50">Tela Inteira</span>
                      </div>
                      <div className="py-1">
                        <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                          {m.name}
                        </p>
                        <span className="text-[9px] text-slate-400 truncate block mt-1 font-mono">{m.file_url}</span>
                      </div>
                      <div className="text-[10px] text-rose-300/80 flex items-center gap-1">
                        <Radio className="h-3 w-3 animate-pulse text-rose-400" />
                        <span>Manchetes & Fotos Automáticas</span>
                      </div>
                    </div>
                  ) : m.type === 'video' ? (
                    <video
                      src={m.file_url}
                      muted
                      className="h-full w-full object-cover"
                      poster=""
                    />
                  ) : (
                    <img
                      src={m.file_url}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className={`absolute top-2 right-2 rounded px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-xs border ${
                    m.type === 'weather_clock'
                      ? 'bg-blue-600/90 border-blue-500 text-white shadow-sm'
                      : m.type === 'rss'
                      ? 'bg-rose-600/90 border-rose-500 text-white shadow-sm'
                      : m.type === 'video'
                      ? 'bg-purple-600/90 border-purple-500 text-white shadow-sm'
                      : 'bg-slate-900/90 border-slate-700'
                  }`}>
                    {m.type === 'weather_clock' ? 'CLIMA & HORA' : m.type === 'rss' ? 'NOTÍCIA RSS' : m.type}
                  </span>
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-white text-sm truncate">{m.name}</h4>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {m.duration} segundos
                    </span>
                    <button
                      onClick={() => handleDeleteMedia(m)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-slate-700 transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: RSS */}
      {activeTab === 'rss' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Feeds RSS (Letreiro de Notícias)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Os títulos são exibidos automaticamente na barra inferior dos players ou como mídia de tela inteira
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={handleLoadDefaultRss}
                disabled={isLoadingDefaultRss}
                className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition cursor-pointer disabled:opacity-50"
                title="Sincronizar e recarregar os feeds padrão para o cliente"
              >
                {isLoadingDefaultRss ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span>Restaurar Feeds Padrão</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenRssModal()}
                className="min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Feed RSS</span>
              </button>
            </div>
          </div>

          {/* PAINEL DE CANAIS PRONTOS PARA USO */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Canais Sugeridos Prontos para Usar
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Carregados automaticamente para todos os novos clientes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {RSS_PRESETS.map((preset) => {
                const isAdded = rssList.some(
                  (r) => r.url.trim() === preset.url.trim() || r.name.toLowerCase() === preset.name.toLowerCase()
                );
                return (
                  <div
                    key={preset.url}
                    className="flex flex-col justify-between rounded-lg border border-slate-700/80 bg-slate-900/60 p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-white truncate">{preset.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-800 text-blue-400 border border-slate-700 shrink-0">
                          {preset.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-[170px]">
                        {preset.url}
                      </span>
                      {isAdded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Cadastrado</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddPresetRss(preset)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] transition cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Adicionar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE CARDS VIEW (block md:hidden) */}
          <div className="block md:hidden space-y-3">
            {rssList.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400 text-xs">
                Nenhum canal RSS cadastrado.
              </div>
            ) : (
              rssList.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-sm">{r.name}</h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        r.active
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {r.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-700/60 text-xs font-mono text-slate-300 break-all">
                    {r.url}
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenRssModal(r)}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleToggleRss(r)}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{r.active ? 'Desativar' : 'Ativar'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteRss(r)}
                      className="min-h-[44px] px-3.5 flex items-center justify-center rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 text-xs font-semibold cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP TABLE VIEW (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700 bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800 uppercase font-bold text-slate-400 text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nome do Canal</th>
                  <th className="px-5 py-3.5">URL do Feed</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {rssList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      Nenhum canal RSS cadastrado.
                    </td>
                  </tr>
                ) : (
                  rssList.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-5 py-4 font-bold text-white">{r.name}</td>
                      <td className="px-5 py-4 font-mono text-slate-300 truncate max-w-xs">{r.url}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            r.active
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {r.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRssModal(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleRss(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                            title={r.active ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRss(r)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-slate-700 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: GOOGLE DRIVE & ARQUIVOS DOS CLIENTES */}
      {activeTab === 'files' && (
        <GoogleDriveFileManager
          companies={
            companyInfo
              ? [
                  {
                    id: companyInfo.id,
                    legal_name: companyInfo.name,
                    trade_name: companyInfo.name,
                    cnpj: '',
                    email: '',
                    phone: '',
                    responsible: '',
                    address: '',
                    city: '',
                    state: '',
                    plan_id: '',
                    start_date: '',
                    due_date: '',
                    status: 'active',
                    created_at: '',
                    updated_at: '',
                  },
                ]
              : []
          }
          currentCompanyId={companyInfo?.id}
          isDevAdmin={false}
          showToast={showToast}
        />
      )}

      {/* MODAL PLAYER */}
      {playerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="shrink-0 px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingPlayer ? 'Editar Player' : 'Novo Player'}
              </h3>
              <button
                type="button"
                onClick={() => setPlayerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome do Ponto de Exibição *</label>
                  <input
                    type="text"
                    required
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                    placeholder="Ex: TV Recepção Principal"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Código Único (TV) *</label>
                    <input
                      type="text"
                      required
                      value={playerForm.code}
                      onChange={(e) => setPlayerForm({ ...playerForm, code: e.target.value.toUpperCase() })}
                      placeholder="EX: PLAY-01"
                      className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Localização</label>
                    <input
                      type="text"
                      value={playerForm.location}
                      onChange={(e) => setPlayerForm({ ...playerForm, location: e.target.value })}
                      placeholder="Ex: Balcão 01"
                      className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Orientação & Resolução */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Orientação da Tela & Resolução *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPlayerForm({ ...playerForm, orientation: 'horizontal' })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        playerForm.orientation === 'horizontal'
                          ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
                          Horizontal (16:9)
                        </span>
                        <Tv className="h-4 w-4 text-blue-400 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-9 h-5 rounded border border-current flex items-center justify-center text-[8px] font-mono font-bold">
                          16:9
                        </div>
                        <span className="text-xs font-semibold text-white">1920 × 1080 px</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Smart TVs, Monitores em Modo Paisagem
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlayerForm({ ...playerForm, orientation: 'vertical' })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        playerForm.orientation === 'vertical'
                          ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
                          Vertical (9:16)
                        </span>
                        <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-8 rounded border border-current flex items-center justify-center text-[8px] font-mono font-bold">
                          9:16
                        </div>
                        <span className="text-xs font-semibold text-white">1080 × 1920 px</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Totens Digitais, Telas em Modo Retrato
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Playlist Padrão</label>
                  <select
                    value={playerForm.playlist_id}
                    onChange={(e) => setPlayerForm({ ...playerForm, playlist_id: e.target.value })}
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Sem playlist associada</option>
                    {playlists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingPlayer && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Senha de Acesso do Player</label>
                    <input
                      type="password"
                      value={playerForm.password}
                      onChange={(e) => setPlayerForm({ ...playerForm, password: e.target.value })}
                      placeholder="Padrão: 123456"
                      className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {editingPlayer && (
                  <div className="rounded-xl border border-blue-800/60 bg-blue-950/30 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-blue-400" />
                        <span>Link Único para Atalho na TV (Sem Login)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRegenerateToken(editingPlayer)}
                        className="text-[10px] text-blue-400 hover:text-blue-200 underline font-medium cursor-pointer"
                      >
                        Regenerar Token
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getPlayerDirectUrl(editingPlayer)}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-blue-200 focus:outline-none select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyPlayerLink(editingPlayer)}
                        className="min-h-[34px] px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs cursor-pointer shrink-0"
                      >
                        {copiedPlayerId === editingPlayer.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-300" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(getPlayerDirectUrl(editingPlayer), '_blank')}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                        title="Abrir em Nova Aba"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Abra este link em qualquer TV ou dispositivo de reprodução. O player iniciará automaticamente sem pedir login, senha ou código.
                    </p>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPlayerModalOpen(false)}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer shadow-sm"
                >
                  Salvar Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL OPERADOR */}
      {operatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="shrink-0 px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingOperator ? 'Editar Operador' : 'Novo Operador'}
              </h3>
              <button
                type="button"
                onClick={() => setOperatorModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOperator} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome do Operador *</label>
                  <input
                    type="text"
                    required
                    value={operatorForm.name}
                    onChange={(e) => setOperatorForm({ ...operatorForm, name: e.target.value })}
                    placeholder="Ex: Carlos Atendente"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">E-mail para Login *</label>
                  <input
                    type="email"
                    required
                    value={operatorForm.email}
                    onChange={(e) => setOperatorForm({ ...operatorForm, email: e.target.value })}
                    placeholder="operador@empresa.com"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={operatorForm.phone}
                    onChange={(e) => setOperatorForm({ ...operatorForm, phone: e.target.value })}
                    placeholder="(11) 98888-8888"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {!editingOperator && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Senha Provisória</label>
                    <input
                      type="password"
                      value={operatorForm.password}
                      onChange={(e) => setOperatorForm({ ...operatorForm, password: e.target.value })}
                      placeholder="Padrão: 123456"
                      className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOperatorModalOpen(false)}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer shadow-sm"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PLAYLIST (COM SELEÇÃO E ORDENAÇÃO DE MÍDIAS) */}
      {playlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="shrink-0 px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingPlaylist ? 'Editar Playlist' : 'Nova Playlist'}
              </h3>
              <button
                type="button"
                onClick={() => setPlaylistModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlaylist} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome da Playlist *</label>
                  <input
                    type="text"
                    required
                    value={playlistForm.name}
                    onChange={(e) => setPlaylistForm({ ...playlistForm, name: e.target.value })}
                    placeholder="Ex: Programação Diária - Farmácia"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={playlistForm.description}
                    onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })}
                    placeholder="Observações da grade"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>Cidade do Widget de Clima / Temperatura</span>
                    <span className="text-[10px] text-slate-400 font-normal">Fixo no rodapé do player</span>
                  </label>
                  <input
                    type="text"
                    value={playlistForm.weather_city}
                    onChange={(e) => setPlaylistForm({ ...playlistForm, weather_city: e.target.value })}
                    placeholder="Ex: São Paulo, Campinas, Belo Horizonte, Rio de Janeiro"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    O player buscará a temperatura e clima em tempo real para exibir de forma fixa no ticker da tela.
                  </p>
                </div>

                {/* Itens na Playlist */}
                <div className="border-t border-slate-800 pt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <label className="font-semibold text-slate-300 block">Itens e Sequência da Grade</label>
                      <span className="text-[11px] text-slate-400">Arraste ou ordene a sequência e defina o tempo de cada tela</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPickerModalOpen(true);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" /> Incluir Mídia
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {playlistForm.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center bg-slate-900/50 my-2">
                        <Film className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-300 font-semibold text-xs">Nenhuma mídia adicionada nesta playlist</p>
                        <p className="text-slate-500 text-[11px] mt-1">Clique em "Incluir Mídia" para abrir a biblioteca visual e escolher suas mídias.</p>
                        <button
                          type="button"
                          onClick={() => setMediaPickerModalOpen(true)}
                          className="mt-3 min-h-[40px] px-3.5 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" /> Escolher Mídias Agora
                        </button>
                      </div>
                    ) : (
                      playlistForm.items.map((it, idx) => {
                        const media = mediaList.find((m) => m.id === it.media_id);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 sm:gap-2.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-800 p-2 sm:p-2.5 transition"
                          >
                            <span className="font-mono text-slate-400 font-bold text-xs w-5 sm:w-6 text-center shrink-0">#{idx + 1}</span>

                            {/* Media Thumbnail / Icon */}
                            <div className="h-10 w-12 sm:w-14 shrink-0 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-700">
                              {media?.type === 'weather_clock' ? (
                                <CloudSun className="h-5 w-5 text-amber-400" />
                              ) : media?.type === 'rss' ? (
                                <Newspaper className="h-5 w-5 text-rose-400" />
                              ) : media?.type === 'video' ? (
                                <Film className="h-5 w-5 text-purple-400" />
                              ) : media?.file_url ? (
                                <img
                                  src={media.file_url}
                                  alt={media.name}
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Film className="h-5 w-5 text-slate-500" />
                              )}
                            </div>

                            {/* Media Title and Type Badge */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-xs truncate">
                                {media?.name || 'Mídia Desconhecida'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  media?.type === 'rss'
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                    : media?.type === 'weather_clock'
                                    ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                                    : media?.type === 'video'
                                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                                    : 'bg-slate-700 text-slate-300'
                                }`}>
                                  {media?.type === 'rss' ? 'Notícia RSS' : media?.type === 'weather_clock' ? 'Clima & Hora' : media?.type || 'Mídia'}
                                </span>
                              </div>
                            </div>

                            {/* Duration input */}
                            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 shrink-0">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <input
                                type="number"
                                min={1}
                                max={600}
                                value={it.duration}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const newItems = [...playlistForm.items];
                                  newItems[idx].duration = v === '' ? '' : Number(v);
                                  setPlaylistForm({ ...playlistForm, items: newItems });
                                }}
                                placeholder="10"
                                className="w-10 sm:w-12 bg-transparent text-white text-xs font-bold text-center focus:outline-none"
                              />
                              <span className="text-slate-400 text-[10px] font-semibold">s</span>
                            </div>

                            {/* Order buttons */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const newItems = [...playlistForm.items];
                                  const temp = newItems[idx - 1];
                                  newItems[idx - 1] = newItems[idx];
                                  newItems[idx] = temp;
                                  setPlaylistForm({ ...playlistForm, items: newItems });
                                }}
                                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                title="Subir posição"
                              >
                                <MoveUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === playlistForm.items.length - 1}
                                onClick={() => {
                                  const newItems = [...playlistForm.items];
                                  const temp = newItems[idx + 1];
                                  newItems[idx + 1] = newItems[idx];
                                  newItems[idx] = temp;
                                  setPlaylistForm({ ...playlistForm, items: newItems });
                                }}
                                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                title="Descer posição"
                              >
                                <MoveDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = playlistForm.items.filter((_, i) => i !== idx);
                                  setPlaylistForm({ ...playlistForm, items: newItems });
                                }}
                                className="p-1.5 text-rose-400 hover:text-rose-300 ml-0.5 cursor-pointer"
                                title="Remover da playlist"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {playlistForm.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMediaPickerModalOpen(true)}
                      className="mt-2.5 w-full min-h-[40px] py-2 rounded-lg border border-dashed border-slate-700 hover:border-blue-500/80 bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-blue-400" />
                      <span>Incluir Outra Mídia da Biblioteca</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPlaylistModalOpen(false)}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer shadow-sm"
                >
                  Salvar Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SELETOR DE MÍDIAS PARA A PLAYLIST */}
      {mediaPickerModalOpen && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100 flex flex-col max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="shrink-0 px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Film className="h-5 w-5 text-blue-400 shrink-0" />
                  <span>Selecionar Mídia</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Toque na mídia para adicioná-la à sequência
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetMediaModalState();
                    setMediaModalOpen(true);
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Nova Mídia</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaPickerModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'Todas', count: mediaList.length },
                  { id: 'image', label: 'Imagens', count: mediaList.filter((m) => m.type === 'image').length },
                  { id: 'video', label: 'Vídeos', count: mediaList.filter((m) => m.type === 'video').length },
                  { id: 'rss', label: 'Notícias RSS', count: mediaList.filter((m) => m.type === 'rss').length },
                  { id: 'weather_clock', label: 'Clima & Hora', count: mediaList.filter((m) => m.type === 'weather_clock').length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMediaPickerFilter(tab.id as any)}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      mediaPickerFilter === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        mediaPickerFilter === tab.id ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px] max-w-xs flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={mediaPickerSearch}
                  onChange={(e) => setMediaPickerSearch(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Grid of Media */}
            <div className="flex-1 overflow-y-auto py-4 pr-1">
              {filteredPickerMedia.length === 0 ? (
                <div className="py-12 text-center">
                  <Film className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Nenhuma mídia encontrada</p>
                  <p className="text-xs text-slate-500 mt-1">Carregue imagens, vídeos ou notícias RSS para adicionar à playlist.</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetMediaModalState();
                      setMediaModalOpen(true);
                    }}
                    className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Cadastrar Mídia Agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredPickerMedia.map((m) => {
                    const timesInPlaylist = playlistForm.items.filter((it) => it.media_id === m.id).length;
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMediaForPlaylist(m)}
                        className="group relative rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-800 hover:border-blue-500 hover:shadow-lg transition cursor-pointer overflow-hidden flex flex-col justify-between"
                      >
                        {/* Media Visual Preview */}
                        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                          {m.type === 'weather_clock' ? (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950/60 to-slate-900 p-3 flex flex-col justify-between">
                              <div className="flex items-center justify-between text-blue-400 text-xs">
                                <span className="font-mono font-bold">12:30:00</span>
                                <span className="text-[9px] uppercase font-bold tracking-wider">Hora Certa</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CloudSun className="h-6 w-6 text-amber-400" />
                                <span className="text-sm font-bold text-white">24°C Clima</span>
                              </div>
                            </div>
                          ) : m.type === 'rss' ? (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-rose-950/60 to-slate-900 p-3 flex flex-col justify-between">
                              <div className="flex items-center justify-between text-rose-400 text-xs">
                                <div className="flex items-center gap-1">
                                  <Newspaper className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-bold uppercase">Notícias RSS</span>
                                </div>
                                <span className="text-[9px] bg-rose-900/60 text-rose-200 px-1.5 py-0.5 rounded font-bold">Tela Inteira</span>
                              </div>
                              <div className="py-1">
                                <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{m.name}</p>
                              </div>
                            </div>
                          ) : m.type === 'video' ? (
                            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-blue-400">
                              <Film className="h-8 w-8 mb-1" />
                              <span className="text-[10px] font-bold text-slate-400">Vídeo</span>
                            </div>
                          ) : (
                            <img
                              src={m.file_url}
                              alt={m.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          )}

                          {/* Badge tipo */}
                          <span
                            className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-bold text-white uppercase backdrop-blur-xs border ${
                              m.type === 'rss'
                                ? 'bg-rose-600/90 border-rose-500'
                                : m.type === 'weather_clock'
                                ? 'bg-blue-600/90 border-blue-500'
                                : m.type === 'video'
                                ? 'bg-purple-600/90 border-purple-500'
                                : 'bg-slate-900/90 border-slate-700'
                            }`}
                          >
                            {m.type === 'rss' ? 'RSS' : m.type === 'weather_clock' ? 'CLIMA' : m.type}
                          </span>

                          {/* Badge se já está na playlist */}
                          {timesInPlaylist > 0 && (
                            <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600/90 border border-emerald-500 text-[10px] font-bold text-white px-2 py-0.5 flex items-center gap-1 shadow-md">
                              <Check className="h-3 w-3" /> Na Playlist ({timesInPlaylist}x)
                            </span>
                          )}
                        </div>

                        {/* Body & Actions */}
                        <div className="p-3">
                          <h4 className="font-bold text-white text-xs truncate group-hover:text-blue-300 transition">
                            {m.name}
                          </h4>
                          <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              <span>Padrão: {m.duration}s</span>
                            </span>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition shadow-xs"
                            >
                              <Plus className="h-3 w-3" /> Escolher
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span>Total de {filteredPickerMedia.length} mídia(s) disponíveis</span>
              <button
                type="button"
                onClick={() => setMediaPickerModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MÍDIA */}
      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

            <div className="shrink-0 px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 shrink-0">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Cadastrar Nova Mídia</h3>
                  <p className="text-[11px] text-slate-400">Arquivos do dispositivo ou links externos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMediaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedia} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                {/* SELETOR DE ORIGEM DA MÍDIA */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5 text-xs">Origem da Mídia</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaSourceType('device');
                        if (selectedDeviceFile) {
                          setMediaForm((prev) => ({
                            ...prev,
                            type: selectedDeviceFile.isVideo ? 'video' : 'image',
                          }));
                        }
                      }}
                      className={`min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        mediaSourceType === 'device'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <HardDrive className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Dispositivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaSourceType('drive');
                        loadCompanyDriveDocs();
                        if (mediaForm.file_url === 'widget:weather_clock') {
                          setMediaForm((prev) => ({ ...prev, file_url: '' }));
                        }
                      }}
                      className={`min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        mediaSourceType === 'drive'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Folder className="h-3.5 w-3.5 shrink-0 text-blue-300" />
                      <span className="truncate">Google Drive</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaSourceType('url');
                        if (mediaForm.file_url === 'widget:weather_clock') {
                          setMediaForm((prev) => ({ ...prev, file_url: '' }));
                        }
                      }}
                      className={`min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        mediaSourceType === 'url'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">URL / Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaSourceType('rss');
                        setMediaForm((prev) => ({
                          ...prev,
                          type: 'rss',
                          file_url:
                            prev.file_url === 'widget:weather_clock' || !prev.file_url
                              ? 'https://g1.globo.com/rss/g1/brasil/'
                              : prev.file_url,
                          name: prev.name || 'Notícias G1 Brasil',
                          duration: prev.duration || 15,
                        }));
                      }}
                      className={`min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        mediaSourceType === 'rss'
                          ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Newspaper className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Notícias RSS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaSourceType('weather_clock');
                        setMediaForm((prev) => ({
                          ...prev,
                          type: 'weather_clock',
                          file_url: 'widget:weather_clock',
                          name: prev.name || 'Hora Certa & Previsão do Tempo',
                          duration: prev.duration || 12,
                        }));
                      }}
                      className={`min-h-[42px] flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        mediaSourceType === 'weather_clock'
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <CloudSun className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Clima & Hora</span>
                    </button>
                  </div>
                </div>

                {/* 1. SELEÇÃO DO ARQUIVO DO DISPOSITIVO */}
              {mediaSourceType === 'device' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Arquivo do Computador ou Celular *
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime,video/ogg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProcessDeviceFile(file);
                    }}
                  />

                  {!selectedDeviceFile ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleProcessDeviceFile(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                        isDraggingFile
                          ? 'border-blue-400 bg-blue-950/40 text-blue-200 scale-[0.99]'
                          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <div className="p-3 rounded-full bg-blue-600/10 text-blue-400 mb-2.5">
                        <FileUp className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-white mb-1">
                        Clique para escolher ou arraste o arquivo aqui
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Suporta vídeos (MP4, WebM, MOV) e imagens (JPG, PNG, WEBP, GIF) até 50 MB
                      </p>
                      <button
                        type="button"
                        className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 transition shadow-xs pointer-events-none"
                      >
                        Selecionar Arquivo do Dispositivo
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-700 bg-slate-800/90 p-3.5 space-y-3">
                      <div className="relative rounded-lg overflow-hidden bg-black/60 border border-slate-700 flex items-center justify-center max-h-44">
                        {selectedDeviceFile.isVideo ? (
                          <video
                            src={selectedDeviceFile.dataUrl}
                            className="w-full max-h-44 object-contain"
                            controls
                            muted
                          />
                        ) : (
                          <img
                            src={selectedDeviceFile.dataUrl}
                            alt="Pré-visualização"
                            className="w-full max-h-44 object-contain"
                          />
                        )}
                        <span className="absolute top-2 left-2 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase bg-slate-900/90 border border-slate-700 text-white shadow-sm">
                          {selectedDeviceFile.isVideo ? 'VÍDEO CARREGADO' : 'IMAGEM CARREGADA'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="truncate pr-2">
                          <p className="font-bold text-white truncate flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">{selectedDeviceFile.name}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {selectedDeviceFile.sizeFormatted} • {selectedDeviceFile.type}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
                          >
                            Trocar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDeviceFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-700 cursor-pointer"
                            title="Remover arquivo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* GOOGLE DRIVE: SELEÇÃO OU UPLOAD */}
              {mediaSourceType === 'drive' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/40">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="font-bold text-white text-xs">Google Drive da Empresa</p>
                        <p className="text-[10px] text-slate-400">
                          {companyInfo?.name ? `Pasta: Painel_TV_Empresas / ${companyInfo.name}` : 'Arquivos organizados na nuvem'}
                        </p>
                      </div>
                    </div>
                    {!getCachedToken() ? (
                      <button
                        type="button"
                        onClick={requestGoogleLogin}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase transition cursor-pointer"
                      >
                        Conectar Drive
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Conectado
                      </span>
                    )}
                  </div>

                  {/* SUB-TABS: SELECIONAR OU ENVIAR NOVO */}
                  <div className="flex border-b border-slate-700/80 gap-2">
                    <button
                      type="button"
                      onClick={() => setDriveMediaTab('select')}
                      className={`pb-2 px-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
                        driveMediaTab === 'select'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Selecionar do Arquivo ({companyDriveDocs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriveMediaTab('upload')}
                      className={`pb-2 px-1 text-xs font-semibold border-b-2 transition cursor-pointer ${
                        driveMediaTab === 'upload'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      Enviar Nova Foto para o Drive
                    </button>
                  </div>

                  {/* ABA 1: SELEÇÃO DE ARQUIVO JÁ NO DRIVE */}
                  {driveMediaTab === 'select' && (
                    <div className="space-y-2">
                      {isLoadingDriveDocs ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-blue-400" />
                          Carregando arquivos da empresa...
                        </div>
                      ) : companyDriveDocs.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-slate-700 bg-slate-800/40 text-slate-400 space-y-2">
                          <Folder className="h-6 w-6 mx-auto text-slate-500" />
                          <p className="text-xs font-semibold text-slate-300">Nenhum arquivo encontrado no Drive desta empresa.</p>
                          <p className="text-[11px] text-slate-400">
                            Clique na aba "Enviar Nova Foto para o Drive" para enviar sua primeira foto com código único.
                          </p>
                          <button
                            type="button"
                            onClick={() => setDriveMediaTab('upload')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
                          >
                            Enviar Foto Agora
                          </button>
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {companyDriveDocs.map((doc) => {
                            const isSelected = selectedDriveDocId === doc.id;
                            return (
                              <div
                                key={doc.id}
                                onClick={() => {
                                  setSelectedDriveDocId(doc.id);
                                  setMediaForm((prev) => ({
                                    ...prev,
                                    name: prev.name.trim() || doc.title,
                                    file_url: doc.drive_view_url || doc.drive_download_url || '',
                                    type: doc.category === 'photo' ? 'image' : 'image',
                                  }));
                                }}
                                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-950/40 text-white shadow-sm ring-1 ring-blue-500'
                                    : 'border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 text-blue-400 overflow-hidden">
                                    {doc.drive_view_url && (doc.mime_type?.startsWith('image/') || doc.category === 'photo') ? (
                                      <img
                                        src={doc.drive_view_url}
                                        alt={doc.title}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <FileText className="h-4 w-4 text-blue-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-xs text-white truncate">{doc.title}</p>
                                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-blue-300 border border-slate-700 shrink-0">
                                        {doc.unique_code}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {doc.file_name} • {formatFileSize(doc.file_size || 0)}
                                    </p>
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {isSelected ? (
                                    <div className="h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border border-slate-600" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ABA 2: ENVIAR NOVO ARQUIVO / FOTO DIRETAMENTE PARA O GOOGLE DRIVE */}
                  {driveMediaTab === 'upload' && (
                    <div className="space-y-3">
                      <input
                        ref={driveFileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDriveUploadFile(file);
                            const reader = new FileReader();
                            reader.onload = () => {
                              setDriveUploadPreview(reader.result as string);
                              const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                              setMediaForm((prev) => ({
                                ...prev,
                                name: prev.name.trim() === '' ? autoTitle : prev.name,
                                type: file.type.startsWith('video/') ? 'video' : 'image',
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />

                      {!driveUploadFile ? (
                        <div
                          onClick={() => driveFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500 text-slate-400"
                        >
                          <div className="p-3 rounded-full bg-emerald-600/10 text-emerald-400 mb-2.5">
                            <UploadCloud className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">
                            Clique para escolher a foto ou vídeo
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-xs">
                            Será salvo na pasta <strong>Fotos com Código Único</strong> do Google Drive e sincronizado nesta tela
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/90 p-3 space-y-2">
                          <div className="relative rounded-lg overflow-hidden bg-black/60 border border-slate-700 flex items-center justify-center max-h-40">
                            {driveUploadFile.type.startsWith('video/') ? (
                              <video src={driveUploadPreview || ''} className="w-full max-h-40 object-contain" controls />
                            ) : (
                              <img src={driveUploadPreview || ''} alt="Prévia" className="w-full max-h-40 object-contain" />
                            )}
                            <span className="absolute top-2 left-2 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-950/90 border border-emerald-700 text-emerald-300">
                              Pronto para Enviar ao Drive
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="truncate pr-2">
                              <p className="font-bold text-white truncate">{driveUploadFile.name}</p>
                              <p className="text-[10px] text-slate-400">{formatFileSize(driveUploadFile.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDriveUploadFile(null);
                                setDriveUploadPreview(null);
                                if (driveFileInputRef.current) driveFileInputRef.current.value = '';
                              }}
                              className="text-xs text-rose-400 hover:underline cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. URL EXTERNA */}
              {mediaSourceType === 'url' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">URL da Mídia (Web) *</label>
                  <input
                    type="url"
                    required
                    value={mediaForm.file_url}
                    onChange={(e) => setMediaForm({ ...mediaForm, file_url: e.target.value })}
                    placeholder="https://exemplo.com/imagem.jpg ou https://exemplo.com/video.mp4"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Insira o link direto de um vídeo MP4 ou imagem hospedada na web.
                  </p>
                </div>
              )}

              {/* 3. NOTÍCIAS RSS EM TELA INTEIRA */}
              {mediaSourceType === 'rss' && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-200 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-rose-400">
                      <Newspaper className="h-4 w-4" />
                      <span>Mídia de Notícias RSS em Tela Inteira</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Carrega as manchetes em tempo real com imagem e título oficiais direto do feed RSS em <strong>tela inteira</strong>. O player rotaciona as notícias com barra de tempo elegante.
                    </p>
                  </div>

                  {rssList.length > 0 && (
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1.5">
                        Usar um Feed RSS já cadastrado:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {rssList.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setMediaForm((prev) => ({
                                ...prev,
                                name: prev.name || `Notícias - ${r.name}`,
                                file_url: r.url,
                                type: 'rss',
                                duration: prev.duration || 15,
                              }));
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                              mediaForm.file_url === r.url
                                ? 'bg-rose-600 border-rose-500 text-white font-bold shadow-sm'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <Rss className="h-3 w-3 text-rose-400" />
                            <span>{r.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">URL do Feed RSS *</label>
                    <input
                      type="url"
                      required
                      value={mediaForm.file_url}
                      onChange={(e) => setMediaForm({ ...mediaForm, file_url: e.target.value })}
                      placeholder="https://g1.globo.com/rss/g1/saude/ ou https://g1.globo.com/rss/g1/brasil/"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      O player busca automaticamente os títulos e as imagens ligadas a cada notícia.
                    </p>
                  </div>
                </div>
              )}

              {/* 4. WIDGET CLIMA & HORA */}
              {mediaSourceType === 'weather_clock' && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3 text-xs text-blue-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-blue-400">
                    <CloudSun className="h-4 w-4" />
                    <span>Mídia Integrada de Hora Certa & Previsão do Tempo</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Exibe a <strong>hora em tempo real na parte superior</strong> e a <strong>temperatura atual com previsão estendida na parte inferior</strong> durante a rotação da playlist.
                  </p>
                </div>
              )}

              {/* TÍTULO / NOME DA MÍDIA */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título / Nome da Mídia *</label>
                <input
                  type="text"
                  required
                  value={mediaForm.name}
                  onChange={(e) => setMediaForm({ ...mediaForm, name: e.target.value })}
                  placeholder="Ex: Notícias Saúde G1, Banner Promoção..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* TIPO E TEMPO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipo de Mídia *</label>
                  <select
                    value={mediaForm.type}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setMediaForm({
                        ...mediaForm,
                        type: newType,
                        file_url:
                          newType === 'weather_clock'
                            ? 'widget:weather_clock'
                            : mediaForm.file_url === 'widget:weather_clock'
                            ? ''
                            : mediaForm.file_url,
                        duration: newType === 'weather_clock' ? 12 : newType === 'rss' ? 15 : mediaForm.duration,
                      });
                      if (newType === 'weather_clock') setMediaSourceType('weather_clock');
                      if (newType === 'rss') setMediaSourceType('rss');
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="image">Imagem (JPG, PNG, WEBP)</option>
                    <option value="video">Vídeo (MP4, WebM)</option>
                    <option value="rss">Notícias RSS (Tela Inteira)</option>
                    <option value="weather_clock">Clima & Hora Certa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tempo na Tela (seg) *</label>
                  <input
                    type="number"
                    min={2}
                    max={600}
                    required
                    value={mediaForm.duration}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMediaForm({ ...mediaForm, duration: v === '' ? '' : Number(v) });
                    }}
                    placeholder="Ex: 15"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Exemplos Rápidos para Teste */}
              <div className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-800 text-[11px]">
                <p className="text-slate-400 font-medium mb-1.5">Modelos Rápidos para Teste:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Notícias G1 Saúde',
                        'rss',
                        'https://g1.globo.com/rss/g1/saude/',
                        15
                      )
                    }
                    className="bg-rose-600/90 hover:bg-rose-600 text-white font-medium px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                  >
                    <Newspaper className="h-3 w-3" />
                    + RSS G1 Saúde (15s)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Notícias G1 Brasil',
                        'rss',
                        'https://g1.globo.com/rss/g1/brasil/',
                        15
                      )
                    }
                    className="bg-rose-600/90 hover:bg-rose-600 text-white font-medium px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                  >
                    <Newspaper className="h-3 w-3" />
                    + RSS G1 Brasil (15s)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Hora Certa & Previsão do Tempo',
                        'weather_clock',
                        'widget:weather_clock',
                        12
                      )
                    }
                    className="bg-blue-600/80 hover:bg-blue-600 text-white font-medium px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
                  >
                    <CloudSun className="h-3 w-3" />
                    + Clima & Hora Certa
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Medicamentos com Desconto',
                        'image',
                        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80',
                        12
                      )
                    }
                    className="bg-slate-700 px-2 py-1 rounded text-slate-200 hover:bg-slate-600 transition cursor-pointer"
                  >
                    + Banner Farmácia
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Dicas de Hidratação',
                        'image',
                        'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=1200&q=80',
                        10
                      )
                    }
                    className="bg-slate-700 px-2 py-1 rounded text-slate-200 hover:bg-slate-600 transition cursor-pointer"
                  >
                    + Banner Saúde
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      addPresetMedia(
                        'Vídeo Institucional',
                        'video',
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                        15
                      )
                    }
                    className="bg-slate-700 px-2 py-1 rounded text-slate-200 hover:bg-slate-600 transition cursor-pointer"
                  >
                    + Vídeo Exemplo
                  </button>
                </div>
              </div>
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isUploadingMedia}
                  onClick={() => setMediaModalOpen(false)}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isUploadingMedia ||
                    !mediaForm.name.trim() ||
                    (mediaSourceType === 'device' && !selectedDeviceFile && !mediaForm.file_url) ||
                    (mediaSourceType === 'url' && !mediaForm.file_url.trim())
                  }
                  className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isUploadingMedia ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Salvar Mídia</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RSS */}
      {rssModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="shrink-0 px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingRss ? 'Editar Feed RSS' : 'Novo Feed RSS'}
              </h3>
              <button
                type="button"
                onClick={() => setRssModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRss} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
                {!editingRss && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Canais Prontos (Clique para preencher)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {RSS_PRESETS.map((p) => (
                        <button
                          key={p.url}
                          type="button"
                          onClick={() => setRssForm({ name: p.name, url: p.url })}
                          className={`min-h-[30px] px-2 py-1 rounded text-[10px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                            rssForm.url === p.url
                              ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          <span>{p.name.split(' - ')[1] || p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome do Canal *</label>
                  <input
                    type="text"
                    required
                    value={rssForm.name}
                    onChange={(e) => setRssForm({ ...rssForm, name: e.target.value })}
                    placeholder="Ex: G1 Brasil"
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">URL do Link RSS (XML) *</label>
                  <input
                    type="url"
                    required
                    value={rssForm.url}
                    onChange={(e) => setRssForm({ ...rssForm, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRssModalOpen(false)}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer shadow-sm"
                >
                  Salvar RSS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESET SENHA (PLAYER OU OPERADOR) */}
      {resetPasswordData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-slate-100 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">{resetPasswordData.title}</h3>
              <button
                type="button"
                onClick={() => setResetPasswordData((p) => ({ ...p, isOpen: false }))}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Informe a nova senha temporária para o acesso.
            </p>
            <form onSubmit={handlePerformPasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Deixe em branco para o padrão: 123456"
                  className="w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordData((p) => ({ ...p, isOpen: false }))}
                  className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LINK ÚNICO DO PLAYER */}
      {playerDirectLinkModal.isOpen && playerDirectLinkModal.player && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-blue-950 p-2 border border-blue-800/80 text-blue-400">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Link Único de Auto-Início</h3>
                  <p className="text-xs text-slate-400">
                    {playerDirectLinkModal.player.name} &bull; Código{' '}
                    <span className="font-mono text-blue-400 font-bold">{playerDirectLinkModal.player.code}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlayerDirectLinkModal({ isOpen: false, player: null })}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Explication banner */}
              <div className="rounded-xl border border-blue-800/60 bg-blue-950/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs">
                  <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>Acesso Instantâneo Sem Login</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Ao abrir este link em qualquer aparelho (Smart TV, TV Box, Mini PC ou Monitor), o reprodutor carrega e inicia a exibição imediatamente sem pedir código, login ou senha.
                </p>
              </div>

              {/* Link Input & Copy */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-300">URL Direta do Player com Token Seguro</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getPlayerDirectUrl(playerDirectLinkModal.player)}
                    className="flex-1 min-h-[44px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-blue-300 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyPlayerLink(playerDirectLinkModal.player!)}
                    className={`min-h-[44px] px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0 ${
                      copiedPlayerId === playerDirectLinkModal.player.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {copiedPlayerId === playerDirectLinkModal.player.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* How to use on TV */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Como instalar no aparelho/TV:</h4>
                <ol className="space-y-2 text-slate-300 text-[11px] list-decimal list-inside leading-relaxed">
                  <li>
                    <strong className="text-white">Copie o link único</strong> acima usando o botão azul.
                  </li>
                  <li>
                    <strong className="text-white">Abra o navegador</strong> da sua Smart TV, TV Box, Raspberry Pi ou aparelho de exibição.
                  </li>
                  <li>
                    <strong className="text-white">Cole e acesse o link</strong>. O reprodutor entrará direto exibindo a playlist de vídeos/fotos, notícias RSS e clima.
                  </li>
                  <li>
                    <strong className="text-white">Crie um atalho</strong> na tela inicial da TV ou salve nos Favoritos para inicialização automática ao ligar o aparelho.
                  </li>
                </ol>
              </div>

              {/* Security & Token reset */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Token de Segurança Único</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {playerDirectLinkModal.player.access_token || 'Token ativo'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRegenerateToken(playerDirectLinkModal.player!)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer shrink-0"
                  title="Gerar novo token invalida os atalhos antigos"
                >
                  Regenerar Token
                </button>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPlayerDirectLinkModal({ isOpen: false, player: null })}
                className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.open(getPlayerDirectUrl(playerDirectLinkModal.player!), '_blank')}
                className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Testar Reprodutor em Nova Aba</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE AÇÃO */}
      <ConfirmModal
        isOpen={confirmData.isOpen}
        title={confirmData.title}
        message={confirmData.message}
        onConfirm={confirmData.action}
        onCancel={() => setConfirmData((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};
