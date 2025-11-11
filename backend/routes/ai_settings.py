from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from extensions import db
from config import Config
from models.ai_setting import AISetting
from services.ai import test_ai_settings

ai_settings_bp = Blueprint('ai_settings', __name__)


def _get_setting_or_default():
    config = Config()
    setting = AISetting.query.first()
    return {
        'prompt': setting.prompt if setting else '',
        'model': setting.model if setting and setting.model else config.OPENAI_MODEL,
        'base_url': setting.base_url if setting and setting.base_url else config.OPENAI_API_URL,
        'has_api_key': bool(setting and setting.api_key)
    }


@ai_settings_bp.route('/ai-settings', methods=['GET'])
@jwt_required()
def get_ai_settings():
    data = _get_setting_or_default()
    return jsonify({'code': 0, 'msg': 'success', 'data': data})


@ai_settings_bp.route('/ai-settings', methods=['PUT'])
@jwt_required()
def update_ai_settings():
    payload = request.get_json() or {}
    setting = AISetting.query.first()
    if not setting:
        setting = AISetting()
        db.session.add(setting)

    if 'prompt' in payload:
        setting.prompt = payload.get('prompt') or None
    if 'model' in payload:
        setting.model = payload.get('model') or None
    if 'base_url' in payload:
        setting.base_url = payload.get('base_url') or None
    if 'api_key' in payload:
        setting.api_key = payload.get('api_key') or None

    db.session.commit()

    return jsonify({'code': 0, 'msg': 'AI设置已保存', 'data': setting.to_dict()})


@ai_settings_bp.route('/ai-settings/test', methods=['POST'])
@jwt_required()
def test_ai_settings_endpoint():
    payload = request.get_json() or {}
    setting = AISetting.query.first()
    test_payload = {
        'prompt': payload.get('prompt') or (setting.prompt if setting else ''),
        'model': payload.get('model') or (setting.model if setting else ''),
        'base_url': payload.get('base_url') or (setting.base_url if setting else ''),
        'api_key': payload.get('api_key') or (setting.api_key if setting else '')
    }

    result = test_ai_settings(test_payload)
    if result['success']:
        return jsonify({'code': 0, 'msg': 'AI服务可用'})
    return jsonify({'code': 1, 'msg': result['error'] or 'AI服务不可用'}), 400
