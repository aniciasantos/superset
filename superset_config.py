import os

# SECRET_KEY from environment variable
SECRET_KEY = os.environ.get('SECRET_KEY')

# Force PostgreSQL usage
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
else:
    # Fallback - this should not happen on Heroku
    raise Exception("DATABASE_URL not found")

SQLALCHEMY_TRACK_MODIFICATIONS = False
