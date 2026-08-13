-- Fix: Map 'freelance' → 'du_an' trong merge_demand_inbox()
-- Lý do: demand_leads có CHECK constraint chỉ cho phép: 'du_an', 'retainer', 'tuyen_dung', 'khong_ro'
-- Nhưng code cũ có thể trả về 'freelance' từ suyRaHinhThuc()

CREATE OR REPLACE FUNCTION public.merge_demand_inbox()
RETURNS TABLE(them_moi int, bi_chan int, da_co int, trung_noi_dung int, het_han int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_row record; v_item jsonb; v_key text; v_hash text; v_ttl int;
  v_posted timestamptz; v_expires timestamptz;
  v_hinh_thuc text;
  c_them int := 0; c_chan int := 0; c_daco int := 0; c_trung int := 0; c_het int := 0;
BEGIN
  IF NOT public.co_quyen_ghi() THEN
    RAISE EXCEPTION 'Không có quyền: cần vai trò editor hoặc admin đã phê duyệt.';
  END IF;
  PERFORM set_config('app.qua_merge_demand', 'on', true);

  FOR v_row IN SELECT * FROM public.demand_inbox WHERE NOT processed ORDER BY id LOOP
    FOR v_item IN SELECT jsonb_array_elements(v_row.payload) LOOP
      v_key := public.dm_chuan_hoa_key(COALESCE(v_item->>'lead_key', v_item->>'url', v_item->>'source_url'));
      IF v_key IS NULL THEN c_chan := c_chan + 1; CONTINUE; END IF;
      IF EXISTS (SELECT 1 FROM public.demand_blocklist b WHERE b.khoa = v_key) THEN
        c_chan := c_chan + 1; CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM public.demand_leads l WHERE l.lead_key = v_key) THEN
        c_daco := c_daco + 1; CONTINUE;
      END IF;

      v_hash := public.dm_hash_noi_dung(COALESCE(v_item->>'raw_text', v_item->>'title'));
      IF v_hash IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.demand_leads l
        WHERE l.content_hash = v_hash AND l.captured_at > now() - INTERVAL '30 days') THEN
        c_trung := c_trung + 1; CONTINUE;
      END IF;

      SELECT s.ttl_gio INTO v_ttl FROM public.demand_sources s WHERE s.ma = v_item->>'source';
      v_ttl := COALESCE(v_ttl, 72);
      BEGIN v_posted := NULLIF(v_item->>'posted_at','')::timestamptz;
      EXCEPTION WHEN OTHERS THEN v_posted := NULL; END;
      v_expires := COALESCE(v_posted, now()) + make_interval(hours => v_ttl);
      IF v_expires <= now() THEN c_het := c_het + 1; CONTINUE; END IF;

      -- FIX: map 'freelance' → 'du_an' để khớp DB constraint
      v_hinh_thuc := COALESCE(NULLIF(v_item->>'hinh_thuc',''), 'khong_ro');
      IF v_hinh_thuc = 'freelance' THEN v_hinh_thuc := 'du_an'; END IF;

      INSERT INTO public.demand_leads(
        lead_key, content_hash, source, source_url, source_query,
        posted_at, expires_at, title, raw_text, nhu_cau, nganh, khu_vuc, hinh_thuc,
        contact_name, contact_phone, contact_zalo, contact_email, contact_url,
        budget_text, budget_min, budget_max,
        score, score_breakdown, tier, do_canh_tranh, evidence, auto_notes)
      VALUES (
        v_key, v_hash, COALESCE(v_item->>'source','khac'),
        v_item->>'source_url', v_item->>'source_query', v_posted, v_expires,
        v_item->>'title', v_item->>'raw_text',
        COALESCE((SELECT array(SELECT jsonb_array_elements_text(v_item->'nhu_cau'))), '{}'),
        v_item->>'nganh', v_item->>'khu_vuc', v_hinh_thuc,
        v_item->>'contact_name', v_item->>'contact_phone', v_item->>'contact_zalo',
        v_item->>'contact_email', v_item->>'contact_url',
        v_item->>'budget_text',
        NULLIF(v_item->>'budget_min','')::bigint, NULLIF(v_item->>'budget_max','')::bigint,
        NULLIF(v_item->>'score','')::int, v_item->'score_breakdown',
        NULLIF(v_item->>'tier',''), NULLIF(v_item->>'do_canh_tranh','')::int,
        v_item->>'evidence', v_item->>'auto_notes');
      c_them := c_them + 1;
    END LOOP;
  END LOOP;

  UPDATE public.demand_inbox SET processed = true WHERE NOT processed;
  PERFORM set_config('app.qua_merge_demand', 'off', true);
  them_moi := c_them; bi_chan := c_chan; da_co := c_daco;
  trung_noi_dung := c_trung; het_han := c_het;
  RETURN NEXT;
END;
$$;

-- Ghi log migration
INSERT INTO public.demand_query_log (query, method, source, ghi_chu)
VALUES ('merge_demand_inbox_v2', 'migration', 'system', 'Fix: map freelance → du_an');
