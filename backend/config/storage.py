"""Storage S3-compatible avec URL publique Supabase pour les photos du catalogue.

Le bucket doit être public en lecture, mais l'écriture est faite uniquement par le backend
avec les identifiants S3 privés gardés dans les variables d'environnement du serveur.
"""
import os
from urllib.parse import quote
from storages.backends.s3 import S3Storage

class SupabasePublicStorage(S3Storage):
    def url(self, name, parameters=None, expire=None, http_method=None):
        base = os.environ.get("SUPABASE_URL", "").rstrip("/")
        bucket = os.environ.get("AWS_STORAGE_BUCKET_NAME", "").strip()
        if not base or not bucket:
            return super().url(name, parameters=parameters, expire=expire, http_method=http_method)
        safe_name = quote(str(name).lstrip("/"), safe="/")
        return f"{base}/storage/v1/object/public/{quote(bucket, safe='')}/{safe_name}"
