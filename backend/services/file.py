import os
from werkzeug.utils import secure_filename
import uuid
from config import Config

def allowed_file(filename):
    config = Config()
    ext = filename.rsplit('.', 1)[-1].lower()
    return ext in config.ALLOWED_IMAGE_EXTENSIONS

def allowed_pdf_file(filename):
    """验证PDF文件格式"""
    config = Config()
    ext = filename.rsplit('.', 1)[-1].lower()
    return ext in config.ALLOWED_PDF_EXTENSIONS

def save_file(file_storage, subdir=''):
    config = Config()
    ext = file_storage.filename.rsplit('.', 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_dir = os.path.join(config.UPLOAD_FOLDER, subdir) if subdir else config.UPLOAD_FOLDER
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, filename)
    file_storage.save(save_path)
    return filename, save_path

def save_pdf_file(file_storage, subdir='articles/pdf'):
    """专门处理PDF文件保存"""
    config = Config()
    if not allowed_pdf_file(file_storage.filename):
        raise ValueError(f"不支持的PDF文件格式: {file_storage.filename}")

    ext = file_storage.filename.rsplit('.', 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_dir = os.path.join(config.UPLOAD_FOLDER, subdir)
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, filename)
    file_storage.save(save_path)
    return filename, save_path

def delete_file(filename, subdir=''):
    config = Config()
    path = os.path.join(config.UPLOAD_FOLDER, subdir, filename) if subdir else os.path.join(config.UPLOAD_FOLDER, filename)
    if os.path.exists(path):
        os.remove(path)
        return True
    return False

def delete_pdf_file(filename, subdir='articles/pdf'):
    """专门处理PDF文件删除"""
    return delete_file(filename, subdir) 
