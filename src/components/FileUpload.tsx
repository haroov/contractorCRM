import React, { useState, useRef, useEffect } from 'react';
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
    const [localThumbnailUrl, setLocalThumbnailUrl] = useState<string | undefined>(thumbnailUrl);
    const [localFileUrl, setLocalFileUrl] = useState<string | undefined>(value);

    useEffect(() => {
        setLocalThumbnailUrl(thumbnailUrl);
    }, [thumbnailUrl]);

    useEffect(() => {
        setLocalFileUrl(value);
    }, [value]);

    const previewUrl = thumbnailUrl || localThumbnailUrl;
    const fileUrlForOpen = localFileUrl || value;
    // If we have a thumbnail, we should show the file as uploaded even if fileUrl is missing
    const hasFile = (!!fileUrlForOpen || !!previewUrl) && !optimisticClear;
    const hasPreview = !!previewUrl && !optimisticClear;

    // Debug logging
    console.log(`📁 FileUpload ${label} - value:`, value);
    console.log(`📁 FileUpload ${label} - thumbnailUrl:`, thumbnailUrl);
    console.log(`📁 FileUpload ${label} - localFileUrl:`, localFileUrl);
    console.log(`📁 FileUpload ${label} - localThumbnailUrl:`, localThumbnailUrl);
    console.log(`📁 FileUpload ${label} - isUploading:`, isUploading);
    console.log(`📁 FileUpload ${label} - hasFile:`, hasFile);
    console.log(`📁 FileUpload ${label} - hasPreview:`, hasPreview);

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

                // Normalize response keys
                const fileUrl = result?.data?.url || result?.data?.fileUrl || result?.url;
                let thumbUrl = result?.data?.thumbnailUrl || result?.thumbnailUrl;

                console.log('🔍 Extracted fileUrl:', fileUrl);
                console.log('🔍 Extracted thumbUrl:', thumbUrl);

                // Check if this is an Excel or CSV file and generate thumbnail if needed
                const isExcelOrCsv = file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/);
                if (isExcelOrCsv && !thumbUrl) {
                    console.log('📊 Excel/CSV file detected, generating thumbnail...');
                    try {
                        const thumbnailFormData = new FormData();
                        thumbnailFormData.append('file', file);
                        
                        const thumbnailResponse = await authenticatedFetch('/api/sheet-thumb', {
                            method: 'POST',
                            body: thumbnailFormData
                        });

                        if (thumbnailResponse.ok) {
                            const thumbnailResult = await thumbnailResponse.json();
                            thumbUrl = thumbnailResult.url;
                            console.log('✅ Thumbnail generated:', thumbUrl);
                        } else {
                            console.warn('⚠️ Failed to generate thumbnail, continuing without it');
                        }
                    } catch (thumbnailError) {
                        console.warn('⚠️ Thumbnail generation failed:', thumbnailError);
                    }
                }

                // Set creation date from file if not already set - do this FIRST
                if (onCreationDateChange && !creationDateValue) {
                    const fileDate = new Date(file.lastModified);
                    const formattedDate = fileDate.toISOString().split('T')[0];
                    console.log('📅 Setting creation date from file:', formattedDate);
                    onCreationDateChange(formattedDate);
                }

                // Keep thumbnail and file URLs locally for immediate UI update
                if (thumbUrl) setLocalThumbnailUrl(thumbUrl);
                if (fileUrl) setLocalFileUrl(fileUrl);

                // Call onChange with both file URL and thumbnail URL
                onChange(fileUrl, thumbUrl);

                // Auto-save if enabled
                if (autoSave && onAutoSave) {
                    console.log('💾 Auto-saving after file upload...');
                    await onAutoSave();
                    console.log('✅ Auto-save completed');
                }

            } catch (error: any) {
                console.error('❌ Upload error:', error);
                const message = error?.message || 'שגיאה לא ידועה';
                alert('שגיאה בהעלאת הקובץ: ' + message);
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
        
        console.log('🗑️ FileUpload handleDelete called');
        
        try {
            // Clear creation date when deleting file
            if (onCreationDateChange) {
                console.log('🗑️ Clearing creation date on file deletion');
                onCreationDateChange('');
            }
            
            // Call onDelete callback first
            console.log('🗑️ Calling onDelete callback...');
            await onDelete();
            console.log('✅ onDelete callback completed successfully');
            
            // Only hide from UI after successful deletion
            setOptimisticClear(true);
            
            if (autoSave && onAutoSave) {
                console.log('💾 Auto-saving after file deletion...');
                await onAutoSave();
                console.log('✅ Auto-save completed');
            }
        } catch (error: any) {
            console.error('❌ Delete error:', error);
            alert('שגיאה במחיקת הקובץ: ' + error.message);
            // Don't hide from UI on error - keep file visible
            setOptimisticClear(false);
        }
    };

    const getFileIcon = () => {
        const thumb = localThumbnailUrl || thumbnailUrl;
        if (thumb) {
            return (
                <img
                    src={thumb}
                    alt="Thumbnail"
                    style={{
                        width: 56,
                        height: 56,
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
                return <PdfIcon sx={{ fontSize: 56, color: '#d32f2f' }} />;
            } else if (isImage) {
                return <ImageIcon sx={{ fontSize: 56, color: '#1976d2' }} />;
            }
        }

        return <FileIcon sx={{ fontSize: 56, color: '#666' }} />;
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
            {hasPreview ? (
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        backgroundColor: '#6B46C1',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        border: '1px solid #d0d0d0'
                    }}
                    onClick={() => hasFile && window.open(fileUrlForOpen!, '_blank')}
                    title={label}
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="תצוגה מקדימה"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <PdfIcon sx={{ fontSize: 32, color: 'white' }} />
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
                    color: hasFile ? '#6B46C1' : 'text.secondary',
                    fontSize: '1rem',
                    minWidth: 'fit-content',
                    cursor: hasFile ? 'pointer' : 'default',
                    textDecoration: hasFile ? 'underline' : 'none',
                    '&:hover': hasFile ? {
                        color: '#5B21B6',
                        textDecoration: 'underline'
                    } : {}
                }}
                onClick={hasFile ? () => window.open(fileUrlForOpen!, '_blank') : undefined}
            >
                {label}
            </Typography>

            {/* Date field */}
            {showCreationDate && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: 'row-reverse' }}>
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
                    {/* AI Icon */}
                    {aiIcon && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: 'transparent',
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                },
                                '&:focus-within': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.08)'
                                }
                            }}
                        >
                            {aiIcon}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default FileUpload;
