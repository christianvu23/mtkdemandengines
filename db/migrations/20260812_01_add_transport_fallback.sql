-- ============================================================================
-- DEMAND ENGINE — Add transport_fallback to cau_hinh for flexible fallback sequences
-- Thêm khóa transport_fallback (mảng chuỗi transport) vào cau_hinh để cho phép
-- cấu hình cụ thể thứ tự fallback cho mỗi nguồn mà không cần thay đổi code.
--
-- Mặc định: nếu không có transport_fallback trong cau_hinh, sẽ sử dụng hệ thống
-- fallback hard-coded dựa trên transport (gi�iữ nguyên hành vi hiện tại).
--
-- Ví dụ: cho nguồn vlance, ta có thể thiết lập:
--   "transport_fallback": ["browser_run", "unlocker", "truc_tiep"]
-- để thay đổi thứ tự ưu tiên.
--
-- ============================================================================

-- Cập nhật cau_hinh để thêm khóa transport_fallback nếu chưa tồn tại.
-- Nous allons définir une valeur par défaut basée sur la colonne transport existente.
-- Ceci est idempotent: exécuter plusieurs fois ne changera rien après la première exécution.

UPDATE public.demand_sources
SET cau_hinh = cau_hinh ||
    CASE
        WHEN transport = 'truc_tiep' THEN jsonb_build_object('transport_fallback', jsonb_build_array('truc_tiep', 'browser_run', 'unlocker'))::jsonb
        WHEN transport = 'browser_run' THEN jsonb_build_object('transport_fallback', jsonb_build_array('browser_run', 'unlocker'))::jsonb
        WHEN transport = 'unlocker' THEN jsonb_build_object('transport_fallback', jsonb_build_array('unlocker', 'browser_run'))::jsonb
        WHEN transport = 'nap_tay' THEN jsonb_build_object('transport_fallback', jsonb_build_array()))::jsonb -- nap_tay never falls back
        ELSE jsonb_build_object()::jsonb
    END
WHERE cau_hinh ? 'transport_fallback' IS NOT TRUE;

-- Nota bene : la colonne transport possède déjà une contrainte CHECK limitant ses valeurs.
-- Donc les quatre cas ci-dessus couvrent toutes les possibilités.

-- Commentaire : cette mise à jour ne modifie pas les valeurs existantes de transport_fallback,
-- elle n'ajoute la clé que si elle est absente.