CREATE INDEX pgroonga_records_ti_index ON records USING pgroonga (ti) WITH (
    normalizers = '
        NormalizerNFKC130,
        NormalizerTable(
            "normalized", "${table:public.pgrn_variant_characters_index}.normalized",
            "target", "target"
        )'
);

CREATE INDEX pgroonga_records_st_index ON records USING pgroonga (st) WITH (
    normalizers = '
        NormalizerNFKC130,
        NormalizerTable(
            "normalized", "${table:public.pgrn_variant_characters_index}.normalized",
            "target", "target"
        )'
);

CREATE INDEX pgroonga_records_pt_index ON records USING pgroonga (pt) WITH (
    normalizers = '
        NormalizerNFKC130,
        NormalizerTable(
            "normalized", "${table:public.pgrn_variant_characters_index}.normalized",
            "target", "target"
        )'
);

CREATE INDEX pgroonga_authors_name_text_index ON authors USING pgroonga (name_text) WITH (
    normalizers = '
        NormalizerNFKC130,
        NormalizerTable(
            "normalized", "${table:public.pgrn_variant_characters_index}.normalized",
            "target", "target"
        )'
);

CREATE INDEX pgroonga_records_pinyin_index ON records USING pgroonga (
    ti_pinyin,
    st_pinyin,
    pt_pinyin
);

CREATE INDEX pgroonga_authors_name_pinyin_index ON authors USING pgroonga (name_pinyin);
