import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const WS_NAMESPACE = 'ws://localhost:5000/ws/skills';
const API_PATH = '/api/admin/skills';

const SkillsManager = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  // 拉取技能数据
  const fetchSkills = async () => {
    setLoading(true);
    const res = await fetch(API_PATH);
    const data = await res.json();
    setSkills(data.skills || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSkills();
    wsRef.current = new WebSocket(WS_NAMESPACE);
    wsRef.current.onmessage = () => {
      fetchSkills();
    };
    return () => {
      wsRef.current && wsRef.current.close();
    };
  }, []);

  return (
    <Box>
      <Button variant="contained" sx={{ mb: 2 }} onClick={fetchSkills}>手动刷新</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>熟练度</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {skills.map(skill => (
              <TableRow key={skill.id}>
                <TableCell>{skill.name}</TableCell>
                <TableCell>{skill.description}</TableCell>
                <TableCell>{skill.level}</TableCell>
                <TableCell>
                  {/* 编辑、删除按钮 */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SkillsManager; 