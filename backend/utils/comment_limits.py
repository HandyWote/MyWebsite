#!/usr/bin/env python3
"""
评论限制工具模块

提供可配置的评论限制功能，包括：
- IP地址限制
- 时间窗口限制
- 白名单IP
- 管理员豁免
"""

import logging
from datetime import datetime, timedelta
from flask import current_app
from extensions import db
from models.comment import Comment
from flask_jwt_extended import get_jwt_identity, jwt_required

logger = logging.getLogger(__name__)


class CommentLimitChecker:
    """评论限制检查器"""
    
    def __init__(self, config):
        """
        初始化评论限制检查器
        
        Args:
            config: Flask应用配置字典
        """
        self.enabled = config.get('COMMENT_LIMIT_ENABLED', True)
        self.time_window_hours = config.get('COMMENT_LIMIT_TIME_WINDOW', 24)
        self.max_comments = config.get('COMMENT_LIMIT_MAX_COUNT', 3)
        self.exempt_admin = config.get('COMMENT_LIMIT_EXEMPT_ADMIN', True)
    
    def check_comment_limit(self, article_id, ip_address, user_identity=None):
        """
        检查用户是否可以发表评论
        
        Args:
            article_id (int): 文章ID
            ip_address (str): 用户IP地址
            user_identity (str, optional): 用户身份标识（如用户名或ID）
        
        Returns:
            tuple: (bool, str) - (是否允许, 拒绝原因)
        """
        # 如果限制功能未启用，直接允许
        if not self.enabled:
            return True, ""
        
        # 检查IP白名单
        if ip_address in self.whitelist_ips:
            logger.info(f"IP {ip_address} 在白名单中，豁免评论限制")
            return True, ""
        
        # 移除了管理员豁免检查，所有用户都遵守评论限制
        
        # 计算时间窗口的起始时间
        time_start = datetime.utcnow() - timedelta(hours=self.time_window_hours)
        
        # 查询指定IP在指定文章和时间窗口内的评论数量
        try:
            comment_count = Comment.query.filter(
                Comment.article_id == article_id,
                Comment.ip_address == ip_address,
                Comment.created_at >= time_start
            ).count()
            
            logger.info(f"=== 评论限制调试信息 ===")
            logger.info(f"IP {ip_address} 在文章 {article_id} 过去 {self.time_window_hours} 小时内发表了 {comment_count} 条评论")
            logger.info(f"时间窗口起始: {time_start}")
            logger.info(f"当前时间: {datetime.utcnow()}")
            logger.info(f"最大允许评论数: {self.max_comments}")
            logger.info(f"评论限制功能启用状态: {self.enabled}")
            
            if comment_count >= self.max_comments:
                logger.warning(f"评论被限制: 已发表 {comment_count} 条，超过最大限制 {self.max_comments}")
                return False, f"在 {self.time_window_hours} 小时内只能发表 {self.max_comments} 条评论"
            
            logger.info(f"评论允许通过: 已发表 {comment_count} 条，未超过最大限制 {self.max_comments}")
            return True, ""
            
        except Exception as e:
            logger.error(f"检查评论限制时出错: {e}")
            import traceback
            logger.error(f"堆栈跟踪: {traceback.format_exc()}")
            # 出错时默认允许，避免误拒正常用户
            return True, ""


def check_comment_limit(article_id, ip_address, user_identity=None):
    """
    检查评论限制的便捷函数
    
    Args:
        article_id (int): 文章ID
        ip_address (str): 用户IP地址
        user_identity (str, optional): 用户身份标识
    
    Returns:
        tuple: (bool, str) - (是否允许, 拒绝原因)
    """
    logger.info(f"=== 调用 check_comment_limit 函数 ===")
    logger.info(f"文章ID: {article_id}")
    logger.info(f"IP地址: {ip_address}")
    logger.info(f"用户身份: {user_identity}")
    
    checker = CommentLimitChecker(current_app.config)
    result = checker.check_comment_limit(article_id, ip_address, user_identity)
    
    logger.info(f"检查结果: {result}")
    return result


def get_comment_limit_info():
    """
    获取评论限制配置信息
    
    Returns:
        dict: 评论限制配置信息
    """
    config = current_app.config
    return {
        'enabled': config.get('COMMENT_LIMIT_ENABLED', True),
        'time_window_hours': config.get('COMMENT_LIMIT_TIME_WINDOW', 24),
        'max_comments': config.get('COMMENT_LIMIT_MAX_COUNT', 3),
        'exempt_admin': config.get('COMMENT_LIMIT_EXEMPT_ADMIN', True)
    }


def validate_comment_limit_config():
    """
    验证评论限制配置是否有效
    
    Returns:
        tuple: (bool, str) - (是否有效, 错误信息)
    """
    config = current_app.config
    
    # 检查时间窗口是否为正数
    if config.get('COMMENT_LIMIT_TIME_WINDOW', 24) <= 0:
        return False, "评论限制时间窗口必须大于0"
    
    # 检查最大评论数是否为正数
    if config.get('COMMENT_LIMIT_MAX_COUNT', 3) <= 0:
        return False, "评论限制最大数量必须大于0"
    
    return True, ""