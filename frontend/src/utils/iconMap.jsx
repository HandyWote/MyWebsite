import React from 'react';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import WechatIcon from '../components/WechatIcon';
import QQIcon from '../components/QQIcon';

/**
 * 社交图标映射表 - 放在单独文件以避免 React Fast Refresh 警告
 */
export const iconMap = {
  email: <EmailIcon sx={{ color: '#213547' }} />,
  phone: <PhoneIcon sx={{ color: '#213547' }} />,
  wechat: <WechatIcon sx={{ color: '#213547' }} />,
  qq: <QQIcon sx={{ color: '#213547' }} />,
  other: <FileCopyIcon sx={{ color: '#213547' }} />
};
