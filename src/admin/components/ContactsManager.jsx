import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { io } from 'socket.io-client';

const WS_NAMESPACE = 'ws://localhost:5000/ws/contacts';
const API_PATH = 'http://localhost:5000/api/admin/contacts';

const ContactsManager = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchContacts = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch(API_PATH, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
    const socket = io('ws://localhost:5000/contacts', {
      transports: ['websocket'],
      path: '/socket.io',
    });
    socket.on('connect', () => {
      console.log('contacts ws connected');
    });
    socket.on('message', () => {
      fetchContacts();
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Box>
      <Button variant="contained" sx={{ mb: 2 }} onClick={fetchContacts}>手动刷新</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>类型</TableCell>
              <TableCell>内容</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.map(contact => (
              <TableRow key={contact.id}>
                <TableCell>{contact.type}</TableCell>
                <TableCell>{contact.value}</TableCell>
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

export default ContactsManager; 