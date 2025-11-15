import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
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

def _resolve_storage_path(filename, subdir=''):
    """Ensure filename stays within the configured upload directory."""
    if not filename or not filename.strip():
        raise ValueError('文件名不能为空')

    safe_name = secure_filename(filename)
    if safe_name != filename:
        raise ValueError('文件名不合法')

    config = Config()
    base_dir = Path(config.UPLOAD_FOLDER)
    if subdir:
        base_dir = base_dir / subdir
    base_dir = base_dir.resolve()
    base_dir.mkdir(parents=True, exist_ok=True)

    target_path = (base_dir / safe_name).resolve()

    try:
        target_path.relative_to(base_dir)
    except ValueError:
        raise ValueError('文件名不合法')

    return base_dir, target_path

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
    if not allowed_pdf_file(file_storage.filename):
        raise ValueError(f"不支持的PDF文件格式: {file_storage.filename}")

    ext = file_storage.filename.rsplit('.', 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    _, safe_path = _resolve_storage_path(filename, subdir)
    file_storage.save(safe_path)
    return filename, safe_path

def delete_file(filename, subdir=''):
    _, safe_path = _resolve_storage_path(filename, subdir)
    if safe_path.exists():
        os.remove(safe_path)
        return True
    return False

def get_pdf_file_path(filename, subdir='articles/pdf'):
    """获取PDF文件的绝对路径（包含安全检查）"""
    _, safe_path = _resolve_storage_path(filename, subdir)
    return safe_path

def delete_pdf_file(filename, subdir='articles/pdf'):
    """专门处理PDF文件删除"""
    return delete_file(filename, subdir) 
