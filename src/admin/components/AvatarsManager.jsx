import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Avatar, Grid, Paper, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const WS_NAMESPACE = 'ws://localhost:5000/ws/avatars';
const API_PATH = '/api/admin/avatars';

const AvatarsManager = () => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchAvatars = async () => {
    setLoading(true);
    const res = await fetch(API_PATH);
    const data = await res.json();
    setAvatars(data.avatars || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAvatars();
    wsRef.current = new WebSocket(WS_NAMESPACE);
    wsRef.current.onmessage = () => {
      fetchAvatars();
    };
    return () => {
      wsRef.current && wsRef.current.close();
    };
  }, []);

  return (
    <Box>
      <Button variant="contained" sx={{ mb: 2 }} onClick={fetchAvatars}>手动刷新</Button>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {avatars.map(avatar => (
            <Grid item key={avatar.id}>
              <Avatar src={avatar.url} sx={{ width: 60, height: 60 }} />
              <IconButton color="error" size="small"><DeleteIcon /></IconButton>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default AvatarsManager; 