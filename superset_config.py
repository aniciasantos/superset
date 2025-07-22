import os

# SECRET_KEY from environment variable
SECRET_KEY = os.environ.get('SECRET_KEY')

# Database configuration for Heroku Postgres
# SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', '').replace('postgres://', 'postgresql://')

# Other Heroku-friendly settings
# WTF_CSRF_ENABLED = True
# SUPERSET_WEBSERVER_PORT = int(os.environ.get('PORT', 8088))

