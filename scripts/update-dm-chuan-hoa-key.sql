-- Cập nhật SQL function dm_chuan_hoa_key() để strip thêm open_from, search_id
-- Giữ đồng bộ với JS chuanHoaKey() trong chuanhoa.js

CREATE OR REPLACE FUNCTION public.dm_chuan_hoa_key(p_url text)
RETURNS text 
LANGUAGE sql 
IMMUTABLE 
SET search_path TO ''
AS $$
  SELECT nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(btrim(coalesce(p_url, ''))),
            '^https?://(www\.|m\.|vn\.)?',
            ''
          ),
          '[?&](utm_[^&]*|fbclid|gclid|ref|source|open_from|search_id)=[^&]*',
          '',
          'g'
        ),
        '/+$',
        ''
      )
    ),
    ''
  )
$$;

-- Test function
SELECT 
  public.dm_chuan_hoa_key('https://vieclam24h.vn/marketing/test-id123.html?open_from=0301&search_id=abc123&utm_source=google') AS cleaned_key,
  public.dm_chuan_hoa_key('https://vieclam24h.vn/marketing/test-id123.html') AS expected;
