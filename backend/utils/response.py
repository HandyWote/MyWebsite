def success(data=None, msg='success'):
    return {'code': 0, 'msg': msg, 'data': data}

def error(msg='error', code=1, data=None):
    return {'code': code, 'msg': msg, 'data': data} 