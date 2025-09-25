import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    CircularProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as FileIcon
} from '@mui/icons-material';

interface FileUploadProps {
    label: string;
    value?: string;
    thumbnailUrl?: string;
    onChange: (url: string | null, thumbnailUrl?: string | null) => void;
    onCreationDateChange?: (date: string) => void;
    onDelete?: () => void;
    disabled?: boolean;
    accept?: string;
    showCreationDate?: boolean;
    creationDateValue?: string;
    projectId?: string;
    aiIcon?: React.ReactNode;
    // Auto-save functionality
    autoSave?: boolean;
    onAutoSave?: () => Promise<void>;
}

const FileUpload: React.FC<FileUploadProps> = ({
    label,
    value,
    thumbnailUrl,
    onChange,
    onCreationDateChange,
    onDelete,
    disabled = false,
    accept = ".pdf,.jpg,.jpeg,.png",
    showCreationDate = false,
    creationDateValue = '',
    projectId,
    aiIcon,
    autoSave = true,
    onAutoSave
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debug logging
    console.log(`📁 FileUpload ${label} - value:`, value);
    console.log(`📁 FileUpload ${label} - thumbnailUrl:`, thumbnailUrl);
    console.log(`📁 FileUpload ${label} - isUploading:`, isUploading);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (file) {
            setIsUploading(true);
            try {
                // Upload to blob storage
                const formData = new FormData();
                formData.append('file', file);
                if (projectId) {
                    formData.append('projectId', projectId);
                }

                const { authenticatedFetch } = await import('../config/api');
                const response = await authenticatedFetch('/api/upload-project-file', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Upload failed:', response.status, errorText);
                    throw new Error('Upload failed');
                }

                const result = await response.json();
                console.log('✅ Upload successful:', result);

                // Call onChange with both file URL and thumbnail URL
                onChange(result.data.fileUrl, result.data.thumbnailUrl);

                // Auto-save if enabled
                if (autoSave && onAutoSave) {
                    console.log('💾 Auto-saving after file upload...');
                    await onAutoSave();
                    console.log('✅ Auto-save completed');
                }

            } catch (error) {
                console.error('❌ Upload error:', error);
                alert('שגיאה בהעלאת הקובץ: ' + error.message);
            } finally {
                setIsUploading(false);
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleDelete = async () => {
        if (onDelete) {
            try {
                await onDelete();
                
                // Auto-save if enabled
                if (autoSave && onAutoSave) {
                    console.log('💾 Auto-saving after file deletion...');
                    await onAutoSave();
                    console.log('✅ Auto-save completed');
                }
            } catch (error) {
                console.error('❌ Delete error:', error);
                alert('שגיאה במחיקת הקובץ: ' + error.message);
            }
        }
    };

    const getFileIcon = () => {
        if (thumbnailUrl) {
            return (
                <img
                    src={thumbnailUrl}
                    alt="Thumbnail"
                    style={{
                        width: 40,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid #e0e0e0'
                    }}
                />
            );
        }
        
        if (value) {
            // Check file type from URL or value
            const isPdf = value.toLowerCase().includes('.pdf') || value.includes('application/pdf');
            const isImage = value.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) || 
                           value.includes('image/');
            
            if (isPdf) {
                return <PdfIcon sx={{ fontSize: 40, color: '#d32f2f' }} />;
            } else if (isImage) {
                return <ImageIcon sx={{ fontSize: 40, color: '#1976d2' }} />;
            }
        }
        
        return <FileIcon sx={{ fontSize: 40, color: '#666' }} />;
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* File input (hidden) */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                disabled={disabled || isUploading}
                style={{ display: 'none' }}
            />

            {/* Upload button */}
            <Button
                variant="outlined"
                startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                sx={{
                    borderColor: '#6B46C1',
                    color: '#6B46C1',
                    '&:hover': {
                        borderColor: '#5B21B6',
                        backgroundColor: '#F3F0FF'
                    }
                }}
            >
                {isUploading ? 'מעלה...' : 'העלה קובץ'}
            </Button>

            {/* File display */}
            {value && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* File icon/thumbnail */}
                    {getFileIcon()}

                    {/* Delete button */}
                    <Tooltip title="מחק קובץ">
                        <IconButton
                            size="small"
                            onClick={handleDelete}
                            disabled={disabled}
                            sx={{
                                color: '#d32f2f',
                                '&:hover': {
                                    backgroundColor: '#ffebee'
                                }
                            }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            {/* Label text - clickable if file exists */}
            <Typography
                variant="body2"
                sx={{
                    color: value ? '#6B46C1' : 'text.secondary',
                    fontSize: '1rem',
                    minWidth: 'fit-content',
                    cursor: value ? 'pointer' : 'default',
                    textDecoration: value ? 'underline' : 'none',
                    '&:hover': value ? {
                        color: '#5B21B6',
                        textDecoration: 'underline'
                    } : {}
                }}
                onClick={value ? () => window.open(value, '_blank') : undefined}
            >
                {label}
            </Typography>

            {/* AI Icon */}
            {aiIcon}

            {/* Date field */}
            {showCreationDate && (
                <TextField
                    label="תאריך יצירת המסמך"
                    type="date"
                    value={creationDateValue}
                    onChange={(e) => onCreationDateChange?.(e.target.value)}
                    disabled={disabled}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 200 }}
                />
            )}
        </Box>
    );
};

export default FileUpload;
