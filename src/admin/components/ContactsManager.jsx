import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const WS_NAMESPACE = 'ws://localhost:5000/ws/contacts';
const API_PATH = '/api/admin/contacts';

const ContactsManager = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const fetchContacts = async () => {
    setLoading(true);
    const res = await fetch(API_PATH);
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
    wsRef.current = new WebSocket(WS_NAMESPACE);
    wsRef.current.onmessage = () => {
      fetchContacts();
    };
    return () => {
      wsRef.current && wsRef.current.close();
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