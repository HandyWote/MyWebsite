from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from extensions import db
from models.avatar import Avatar
from datetime import datetime
import os
import uuid
from extensions import socketio

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
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    file.save(save_path)
    avatar = Avatar(filename=filename, is_current=True, cropped_info=request.form.get('cropped_info'))
    # 取消之前头像的 is_current
    Avatar.query.filter_by(is_current=True, deleted_at=None).update({'is_current': False})
    db.session.add(avatar)
    db.session.commit()
    url = f"/api/admin/avatars/file/{filename}"
    socketio.emit('avatars_updated')
    return jsonify({'code': 0, 'msg': '上传成功', 'url': url, 'id': avatar.id})

@avatar_bp.route('/avatars/file/<filename>')
def get_avatar_file(filename):
    import os
    print('图片实际路径:', os.path.join(current_app.config['UPLOAD_FOLDER'], filename))
    print('UPLOAD_FOLDER:', current_app.config['UPLOAD_FOLDER'])
    print('请求文件名:', filename)
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

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
    print(f"DELETE request received for avatar_id: {avatar_id}")
    try:
        avatar = Avatar.query.get_or_404(avatar_id)
        print(f"Found avatar: {avatar.id}, filename: {avatar.filename}")
        avatar.deleted_at = datetime.utcnow()
        db.session.commit()
        print(f"Avatar {avatar_id} marked as deleted")
        socketio.emit('avatars_updated')
        return jsonify({'code': 0, 'msg': '删除成功'})
    except Exception as e:
        print(f"Error deleting avatar {avatar_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'code': 1, 'msg': f'删除失败: {str(e)}'}), 500