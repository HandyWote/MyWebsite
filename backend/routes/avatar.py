from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from extensions import db
from models.avatar import Avatar
from datetime import datetime
import os
import uuid
from extensions import socketio
from utils.image_utils import convert_to_webp, should_convert_to_webp, get_webp_filename

avatar_bp = Blueprint('avatar', __name__)

@avatar_bp.route('/avatars', methods=['GET'])
@jwt_required()
def get_avatars():
    print("GET /avatars request received")
    avatars = Avatar.query.filter_by(deleted_at=None).order_by(Avatar.uploaded_at.desc()).all()
    print(f"Found {len(avatars)} avatars")
    return jsonify({'code': 0, 'msg': 'success', 'data': [
        {'id': a.id, 'filename': a.filename, 'is_current': a.is_current, 'cropped_info': a.cropped_info, 'uploaded_at': a.uploaded_at} for a in avatars
    ]})

@avatar_bp.route('/avatars', methods=['POST'])
@jwt_required()
def upload_avatar():
    file = request.files.get('file')
    if not file:
        return jsonify({'code': 1, 'msg': '未上传文件'}), 400
    
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in current_app.config['ALLOWED_IMAGE_EXTENSIONS']:
        return jsonify({'code': 1, 'msg': '不支持的图片格式'}), 400
    
    # 临时文件名（原格式）
    temp_filename = f"{uuid.uuid4().hex}.{ext}"
    temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], temp_filename)
    
    # 保存原始文件
    file.save(temp_path)
    print(f"文件已保存到: {temp_path}")
    
    # 确保文件有正确的权限
    try:
        os.chmod(temp_path, 0o644)
        print(f"文件权限已设置: {temp_path}")
    except Exception as e:
        print(f"设置文件权限失败: {e}")
    
    try:
        # 判断是否需要转换为webp格式
        if should_convert_to_webp(temp_filename):
            # 转换为webp格式
            webp_filename = get_webp_filename(temp_filename)
            webp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], webp_filename)
            print(f"准备转换为webp格式: {temp_path} -> {webp_path}")
            
            # 执行转换
            if convert_to_webp(temp_path, webp_path):
                # 转换成功，删除临时文件，使用webp文件
                os.remove(temp_path)
                final_filename = webp_filename
                print(f"转换成功，使用webp文件: {webp_path}")
                
                # 确保webp文件有正确的权限
                try:
                    os.chmod(webp_path, 0o644)
                    print(f"webp文件权限已设置: {webp_path}")
                except Exception as e:
                    print(f"设置webp文件权限失败: {e}")
            else:
                # 转换失败，使用原始文件
                os.remove(temp_path)
                final_filename = temp_filename
                print(f"转换失败，使用原始文件: {temp_path}")
        else:
            # 已经是webp格式，直接使用
            final_filename = temp_filename
            print(f"已经是webp格式，直接使用: {temp_path}")
        
        # 检查文件是否存在
        final_path = os.path.join(current_app.config['UPLOAD_FOLDER'], final_filename)
        print(f"最终文件路径: {final_path}")
        print(f"文件是否存在: {os.path.exists(final_path)}")
        
        # 创建头像记录
        avatar = Avatar(filename=final_filename, is_current=True, cropped_info=request.form.get('cropped_info'))
        
        # 取消之前头像的 is_current
        Avatar.query.filter_by(is_current=True, deleted_at=None).update({'is_current': False})
        
        db.session.add(avatar)
        db.session.commit()
        
        url = f"/api/admin/avatars/file/{final_filename}"
        print(f"返回的URL: {url}")
        socketio.emit('avatars_updated')
        
        return jsonify({'code': 0, 'msg': '上传成功', 'url': url, 'id': avatar.id})
        
    except Exception as e:
        # 发生错误，清理临时文件
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"上传失败: {str(e)}")
        return jsonify({'code': 1, 'msg': f'上传失败: {str(e)}'}), 500

@avatar_bp.route('/avatars/file/<filename>')
def get_avatar_file(filename):
    import os
    upload_folder = current_app.config['UPLOAD_FOLDER']
    file_path = os.path.join(upload_folder, filename)
    print('UPLOAD_FOLDER:', upload_folder)
    print('请求文件名:', filename)
    print('图片实际路径:', file_path)
    print('文件是否存在:', os.path.exists(file_path))
    print('UPLOAD_FOLDER绝对路径:', os.path.abspath(upload_folder))
    print('文件绝对路径:', os.path.abspath(file_path))
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return jsonify({'code': 1, 'msg': '文件不存在'}), 404
    
    return send_from_directory(upload_folder, filename)

@avatar_bp.route('/avatars/<int:avatar_id>/set_current', methods=['PUT'])
@jwt_required()
def set_current_avatar(avatar_id):
    Avatar.query.filter_by(is_current=True, deleted_at=None).update({'is_current': False})
    avatar = Avatar.query.get_or_404(avatar_id)
    avatar.is_current = True
    db.session.commit()
    socketio.emit('avatars_updated')
    return jsonify({'code': 0, 'msg': '已设为当前头像'})

@avatar_bp.route('/avatars/<int:avatar_id>', methods=['DELETE'])
@jwt_required()
def delete_avatar(avatar_id):
    try:
        avatar = Avatar.query.get_or_404(avatar_id)
        avatar.deleted_at = datetime.utcnow()
        db.session.commit()
        socketio.emit('avatars_updated')
        return jsonify({'code': 0, 'msg': '删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 1, 'msg': f'删除失败: {str(e)}'}), 500