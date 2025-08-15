import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Chip,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import { InputAdornment } from '@mui/material';

/**
 * 文章筛选组件
 * 提供搜索、分类筛选、标签筛选等功能
 */
const ArticleFilters = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedTag,
  onTagClick,
  categories,
  tags,
  onClearFilters,
}) => {
  return (
    <Box sx={{ 
      mb: 6,
      '& .MuiTextField-root': {
        '@media (prefers-color-scheme: dark)': {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }
          }
        }
      },
      '& .MuiFormControl-root': {
        '@media (prefers-color-scheme: dark)': {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }
          }
        }
      }
    }}>
      <Grid container spacing={3} alignItems="stretch">
        {/* 搜索框 */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="搜索文章..."
            value={searchTerm}
            onChange={onSearchChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: '50px !important', // 强制统一高度
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
                '& fieldset': {
                  borderColor: 'rgba(0, 0, 0, 0.23)'
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(0, 0, 0, 0.87)'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main'
                }
              },
              '& .MuiInputBase-input': {
                height: '50px !important',
                display: 'flex',
                alignItems: 'center',
                fontSize: '1rem',
                padding: '16px 14px',
                boxSizing: 'border-box'
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Grid>

        {/* 分类筛选 */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel sx={{ fontSize: '1rem' }}>分类</InputLabel>
            <Select
              value={selectedCategory}
              label="分类"
              onChange={onCategoryChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: '50px !important', // 强制统一高度
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box'
                },
                '& .MuiOutlinedInput-input': {
                  height: '50px !important', // 强制统一高度
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1rem',
                  padding: '16px 14px',
                  boxSizing: 'border-box'
                },
                '& .MuiSelect-select': {
                  height: '50px !important', // 强制统一高度
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1rem',
                  padding: '16px 14px',
                  boxSizing: 'border-box',
                  lineHeight: '50px'
                },
                '& .MuiInputBase-input': {
                  height: '50px !important',
                  boxSizing: 'border-box'
                }
              }}
            >
              <MenuItem value="">全部</MenuItem>
              {Array.isArray(categories) && categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* 清除筛选 */}
        <Grid item xs={12} md={3}>
          <Button
            variant="outlined"
            onClick={onClearFilters}
            fullWidth
            sx={{
              height: '50px !important', // 强制统一高度
              fontSize: '1rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 14px',
              textTransform: 'none',
              boxSizing: 'border-box'
            }}
          >
            清除筛选
          </Button>
        </Grid>
      </Grid>

      {/* 标签筛选 */}
      {Object.keys(tags).length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            标签筛选:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(tags).map(([tag, count]) => (
              <Chip
                key={tag}
                label={`${tag} (${count})`}
                clickable
                color={selectedTag === tag ? 'primary' : 'default'}
                onClick={() => onTagClick(tag)}
                variant={selectedTag === tag ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ArticleFilters;
