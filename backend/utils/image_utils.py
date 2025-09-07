from PIL import Image
import os
import io


def convert_to_webp(input_path, output_path, quality=85):
    """
    将图片转换为webp格式
    
    Args:
        input_path (str): 输入图片路径
        output_path (str): 输出webp图片路径
        quality (int): webp质量 (0-100)
    
    Returns:
        bool: 转换是否成功
    """
    try:
        # 打开原始图片
        with Image.open(input_path) as img:
            # 如果是RGBA模式（带透明通道），使用高质量
            if img.mode in ('RGBA', 'LA'):
                quality = min(quality + 10, 100)
            
            # 转换为RGB模式（如果不是RGBA）
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')
            
            # 保存为webp格式
            img.save(output_path, 'webp', quality=quality, optimize=True)
            return True
            
    except Exception as e:
        print(f"图片转换失败: {e}")
        return False


def should_convert_to_webp(filename):
    """
    判断是否需要转换为webp格式
    
    Args:
        filename (str): 文件名
    
    Returns:
        bool: 是否需要转换
    """
    ext = filename.rsplit('.', 1)[-1].lower()
    return ext in ['jpg', 'jpeg', 'png']


def get_webp_filename(original_filename):
    """
    生成web格式的文件名
    
    Args:
        original_filename (str): 原始文件名
    
    Returns:
        str: webp文件名
    """
    name_without_ext = original_filename.rsplit('.', 1)[0]
    return f"{name_without_ext}.webp"