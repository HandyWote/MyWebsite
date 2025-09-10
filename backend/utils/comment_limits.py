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
            config: 应用配置对象
        """
        self.enabled = config.COMMENT_LIMIT_ENABLED
        self.time_window_hours = config.COMMENT_LIMIT_TIME_WINDOW
        self.max_comments = config.COMMENT_LIMIT_MAX_COUNT
        self.whitelist_ips = config.COMMENT_LIMIT_WHITELIST_IPS
        self.exempt_admin = config.COMMENT_LIMIT_EXEMPT_ADMIN
    
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
        
        # 检查管理员豁免
        if self.exempt_admin and user_identity:
            try:
                # 这里可以根据实际需求判断是否为管理员
                # 例如：检查用户角色或权限
                if self._is_admin_user(user_identity):
                    logger.info(f"用户 {user_identity} 是管理员，豁免评论限制")
                    return True, ""
            except Exception as e:
                logger.warning(f"检查管理员权限时出错: {e}")
        
        # 计算时间窗口的起始时间
        time_start = datetime.utcnow() - timedelta(hours=self.time_window_hours)
        
        # 查询指定IP在指定文章和时间窗口内的评论数量
        try:
            comment_count = Comment.query.filter(
                Comment.article_id == article_id,
                Comment.ip_address == ip_address,
                Comment.created_at >= time_start
            ).count()
            
            logger.info(f"IP {ip_address} 在文章 {article_id} 过去 {self.time_window_hours} 小时内发表了 {comment_count} 条评论")
            
            if comment_count >= self.max_comments:
                return False, f"在 {self.time_window_hours} 小时内只能发表 {self.max_comments} 条评论"
            
            return True, ""
            
        except Exception as e:
            logger.error(f"检查评论限制时出错: {e}")
            # 出错时默认允许，避免误拒正常用户
            return True, ""
    
    def _is_admin_user(self, user_identity):
        """
        检查用户是否为管理员
        
        Args:
            user_identity (str): 用户身份标识
        
        Returns:
            bool: 是否为管理员
        """
        # 这里可以根据实际需求实现管理员判断逻辑
        # 例如：查询数据库中的用户角色
        # 或者检查用户名是否匹配管理员用户名
        
        # 简单实现：检查用户名是否为配置中的管理员用户名
        admin_username = current_app.config.get('ADMIN_USERNAME')
        return user_identity == admin_username


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
    checker = CommentLimitChecker(current_app.config)
    return checker.check_comment_limit(article_id, ip_address, user_identity)


def get_comment_limit_info():
    """
    获取评论限制配置信息
    
    Returns:
        dict: 评论限制配置信息
    """
    config = current_app.config
    return {
        'enabled': config.COMMENT_LIMIT_ENABLED,
        'time_window_hours': config.COMMENT_LIMIT_TIME_WINDOW,
        'max_comments': config.COMMENT_LIMIT_MAX_COUNT,
        'whitelist_ips': config.COMMENT_LIMIT_WHITELIST_IPS,
        'exempt_admin': config.COMMENT_LIMIT_EXEMPT_ADMIN
    }


def validate_comment_limit_config():
    """
    验证评论限制配置是否有效
    
    Returns:
        tuple: (bool, str) - (是否有效, 错误信息)
    """
    config = current_app.config
    
    # 检查时间窗口是否为正数
    if config.COMMENT_LIMIT_TIME_WINDOW <= 0:
        return False, "评论限制时间窗口必须大于0"
    
    # 检查最大评论数是否为正数
    if config.COMMENT_LIMIT_MAX_COUNT <= 0:
        return False, "评论限制最大数量必须大于0"
    
    # 检查白名单IP格式（简单检查）
    for ip in config.COMMENT_LIMIT_WHITELIST_IPS:
        ip = ip.strip()
        if ip and not (ip.replace('.', '').isdigit() or ':' in ip):
            return False, f"无效的IP地址格式: {ip}"
    
    return True, ""