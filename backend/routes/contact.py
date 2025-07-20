from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models.contact import Contact
from datetime import datetime

contact_bp = Blueprint('contact', __name__)

@contact_bp.route('/contacts', methods=['GET'])
@jwt_required()
def get_contacts():
    contacts = Contact.query.filter_by(deleted_at=None).all()
    return jsonify({'code': 0, 'msg': 'success', 'data': [
        {'id': c.id, 'type': c.type, 'value': c.value, 'created_at': c.created_at, 'updated_at': c.updated_at} for c in contacts
    ]})

@contact_bp.route('/contacts', methods=['POST'])
@jwt_required()
def add_contact():
    data = request.json
    contact = Contact(type=data['type'], value=data['value'])
    db.session.add(contact)
    db.session.commit()
    return jsonify({'code': 0, 'msg': '新增成功', 'id': contact.id})

@contact_bp.route('/contacts/<int:contact_id>', methods=['PUT'])
@jwt_required()
def update_contact(contact_id):
    data = request.json
    contact = Contact.query.get_or_404(contact_id)
    contact.type = data.get('type', contact.type)
    contact.value = data.get('value', contact.value)
    contact.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'code': 0, 'msg': '更新成功'})

@contact_bp.route('/contacts/<int:contact_id>', methods=['DELETE'])
@jwt_required()
def delete_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    contact.deleted_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'code': 0, 'msg': '删除成功'}) 