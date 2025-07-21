import os
from werkzeug.utils import secure_filename
from setup import Config
import uuid

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return ext in Config.ALLOWED_IMAGE_EXTENSIONS

def save_file(file_storage, subdir=''):
    ext = file_storage.filename.rsplit('.', 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_dir = os.path.join(Config.UPLOAD_FOLDER, subdir) if subdir else Config.UPLOAD_FOLDER
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, filename)
    file_storage.save(save_path)
    return filename, save_path

def delete_file(filename, subdir=''):
    path = os.path.join(Config.UPLOAD_FOLDER, subdir, filename) if subdir else os.path.join(Config.UPLOAD_FOLDER, filename)
    if os.path.exists(path):
        os.remove(path)
        return True
    return False 