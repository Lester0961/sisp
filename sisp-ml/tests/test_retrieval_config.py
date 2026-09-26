from app.config import Settings


def test_dense_retrieval_defaults_to_local_only_when_database_is_required():
    local = Settings(_env_file=None, require_pgvector=False)
    production = Settings(_env_file=None, require_pgvector=True)

    assert local.use_dense_retrieval is True
    assert production.use_dense_retrieval is False


def test_production_dense_retrieval_requires_explicit_opt_in():
    production = Settings(
        _env_file=None,
        require_pgvector=True,
        dense_retrieval_enabled=True,
    )

    assert production.use_dense_retrieval is True
