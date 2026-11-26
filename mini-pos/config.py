import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "database.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "laclave")
DEBUG = True
PORT = 5000

