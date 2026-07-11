CREATE EXTENSION IF NOT EXISTS pgroonga;

CREATE TABLE organizations (
    fa_code text PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE persons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    preferred_name text NOT NULL,
    dynasty text,
    notes text
);

CREATE TABLE works (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    preferred_title text NOT NULL,
    fi text,
    sf text,
    tg text,
    ki text,
    parent_work_id uuid REFERENCES works (id),
    notes text
);

CREATE TABLE collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fa_code text NOT NULL REFERENCES organizations (fa_code),
    name text NOT NULL
);

CREATE TABLE records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fa_code text NOT NULL REFERENCES organizations (fa_code),
    collection_id uuid REFERENCES collections (id),
    oy_record_id uuid REFERENCES records (id),
    work_id uuid REFERENCES works (id),
    nu text NOT NULL,
    ti text NOT NULL,
    ti_key text NOT NULL,
    ti_pinyin text,
    st text,
    st_pinyin text,
    pt text,
    pt_pinyin text,
    fi text,
    sf text,
    tg text,
    ki text,
    tp text,
    yr text,
    pb text,
    ed text,
    sd text,
    vi text,
    si text,
    rn text,
    co text,
    no text,
    source_mtime timestamptz NOT NULL,
    imported_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT records_natural_key UNIQUE NULLS NOT DISTINCT (fa_code, collection_id, nu),
    CONSTRAINT records_oy_not_self CHECK (oy_record_id IS NULL OR oy_record_id <> id)
);

CREATE TABLE authors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id uuid NOT NULL REFERENCES records (id) ON DELETE CASCADE,
    person_id uuid REFERENCES persons (id),
    dynasty_text text,
    name_text text NOT NULL,
    name_pinyin text,
    role_text text,
    display_order integer NOT NULL CHECK (display_order >= 0)
);

CREATE TABLE variant_characters (
    target text NOT NULL,
    normalized text NOT NULL,
    source text NOT NULL
);

CREATE INDEX records_oy_record_id_index ON records (oy_record_id);
CREATE INDEX records_work_id_index ON records (work_id);
CREATE INDEX authors_record_id_index ON authors (record_id);

CREATE INDEX pgrn_variant_characters_index
    ON variant_characters USING pgroonga
    (target pgroonga_text_term_search_ops_v2, normalized);
