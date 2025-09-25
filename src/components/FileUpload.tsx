import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    CircularProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Description as FileIcon
} from '@mui/icons-material';
import GentleCloudUploadIcon from './GentleCloudUploadIcon';

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
    const [optimisticClear, setOptimisticClear] = useState(false);

    // Debug logging
    console.log(`📁 FileUpload ${label} - value:`, value);
    console.log(`📁 FileUpload ${label} - thumbnailUrl:`, thumbnailUrl);
    console.log(`📁 FileUpload ${label} - isUploading:`, isUploading);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (file) {
            if (optimisticClear) setOptimisticClear(false);
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
        if (!onDelete) return;
        const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק את הקובץ?');
        if (!confirmed) return;
        try {
            // Optimistic UI - hide immediately
            setOptimisticClear(true);
            await onDelete();
            if (autoSave && onAutoSave) {
                console.log('💾 Auto-saving after file deletion...');
                await onAutoSave();
                console.log('✅ Auto-save completed');
            }
        } catch (error: any) {
            console.error('❌ Delete error:', error);
            alert('שגיאה במחיקת הקובץ: ' + error.message);
            // Revert UI if failed
            setOptimisticClear(false);
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

            {/* Upload icon or file preview */}
            {value && !optimisticClear ? (
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: '#6B46C1',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        border: '1px solid #d0d0d0'
                    }}
                    onClick={() => value && window.open(value, '_blank')}
                    title={label}
                >
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt="תצוגה מקדימה"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <PdfIcon sx={{ fontSize: 24, color: 'white' }} />
                    )}

                    {/* Delete X in top-right */}
                    {!disabled && (
                        <IconButton
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                            sx={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 20,
                                height: 20,
                                backgroundColor: 'white',
                                border: '1px solid #d0d0d0',
                                color: '#f44336',
                                '&:hover': { backgroundColor: '#ffebee', borderColor: '#f44336' }
                            }}
                        >
                            <Typography sx={{ fontSize: '12px', lineHeight: 1 }}>×</Typography>
                        </IconButton>
                    )}
                </Box>
            ) : (
                <IconButton
                    disabled={disabled || isUploading}
                    title={label}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                        border: '1px solid #d0d0d0',
                        borderRadius: 1,
                        height: 40,
                        width: 40,
                        color: '#6B46C1',
                        '&:hover': { backgroundColor: 'rgba(156, 39, 176, 0.04)', borderColor: '#6B46C1' }
                    }}
                >
                    {isUploading ? <CircularProgress size={20} /> : <GentleCloudUploadIcon fontSize="xlarge" />}
                </IconButton>
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
