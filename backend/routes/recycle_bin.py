from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from extensions import db
from models.recycle_bin import RecycleBin
from datetime import datetime

recycle_bin_bp = Blueprint('recycle_bin', __name__)

@recycle_bin_bp.route('/recycle-bin', methods=['GET'])
@jwt_required()
def get_recycle_bin():
    items = RecycleBin.query.order_by(RecycleBin.deleted_at.desc()).all()
    return jsonify({'code': 0, 'msg': 'success', 'data': [
        {'id': i.id, 'data_type': i.data_type, 'data_id': i.data_id, 'data_json': i.data_json, 'deleted_at': i.deleted_at} for i in items
    ]})

@recycle_bin_bp.route('/recycle-bin/<int:item_id>/restore', methods=['POST'])
@jwt_required()
def restore_item(item_id):
    # TODO: 恢复逻辑，需根据 data_type/data_json 还原到原表
    return jsonify({'code': 0, 'msg': '恢复成功（待实现）'})

@recycle_bin_bp.route('/recycle-bin/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    item = RecycleBin.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'code': 0, 'msg': '彻底删除成功'})

@recycle_bin_bp.route('/recycle-bin/clear', methods=['POST'])
@jwt_required()
def clear_recycle_bin():
    RecycleBin.query.delete()
    db.session.commit()
    return jsonify({'code': 0, 'msg': '回收站已清空'}) 