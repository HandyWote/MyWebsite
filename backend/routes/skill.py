from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models.skill import Skill
from datetime import datetime
from extensions import socketio

skill_bp = Blueprint('skill', __name__)

@skill_bp.route('/skills', methods=['GET'])
@jwt_required()
def get_skills():
    skills = Skill.query.filter_by(deleted_at=None).all()
    return jsonify({'code': 0, 'msg': 'success', 'data': [
        {'id': s.id, 'name': s.name, 'description': s.description, 'level': s.level} for s in skills
    ]})

@skill_bp.route('/skills', methods=['POST'])
@jwt_required()
def add_skill():
    data = request.json
    skill = Skill(name=data['name'], description=data.get('description', ''), level=data.get('level', 0))
    db.session.add(skill)
    db.session.commit()
    socketio.emit('skills_updated', namespace='/skills')
    return jsonify({'code': 0, 'msg': '新增成功', 'id': skill.id})

@skill_bp.route('/skills/<int:skill_id>', methods=['PUT'])
@jwt_required()
def update_skill(skill_id):
    data = request.json
    skill = Skill.query.get_or_404(skill_id)
    skill.name = data.get('name', skill.name)
    skill.description = data.get('description', skill.description)
    skill.level = data.get('level', skill.level)
    skill.updated_at = datetime.utcnow()
    db.session.commit()
    socketio.emit('skills_updated', namespace='/skills')
    return jsonify({'code': 0, 'msg': '更新成功'})

@skill_bp.route('/skills/<int:skill_id>', methods=['DELETE'])
@jwt_required()
def delete_skill(skill_id):
    skill = Skill.query.get_or_404(skill_id)
    skill.deleted_at = datetime.utcnow()
    db.session.commit()
    socketio.emit('skills_updated', namespace='/skills')
    return jsonify({'code': 0, 'msg': '删除成功'})