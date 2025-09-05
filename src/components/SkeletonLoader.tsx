import React, { useState, useEffect } from 'react';
import { Box, Skeleton, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const SkeletonLoader: React.FC = () => {
    const [showSkeleton, setShowSkeleton] = useState(false);

    useEffect(() => {
        // Show skeleton for at least 1 second to ensure it's visible
        const timer = setTimeout(() => {
            setShowSkeleton(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    if (!showSkeleton) {
        return (
            <Box sx={{
                direction: 'rtl',
                padding: 3,
                backgroundColor: '#f5f5f5',
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontFamily: 'Arial, sans-serif'
            }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Skeleton variant="circular" width={60} height={60} sx={{ mx: 'auto', mb: 2 }} />
                    <Skeleton variant="text" width={200} height={40} sx={{ mx: 'auto' }} />
                </Box>
            </Box>
        );
    }
    return (
        <Box sx={{
            direction: 'rtl',
            padding: 3,
            backgroundColor: '#f5f5f5',
            minHeight: '100vh',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                {/* User Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="text" width={60} height={32} />
                    <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
                </Box>

                {/* Title Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton variant="text" width={200} height={40} />
                    <Skeleton variant="circular" width={40} height={40} />
                </Box>
            </Box>

            {/* Search Bar */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 2, maxWidth: 600 }} />
            </Box>

            {/* Summary Cards */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, justifyContent: 'center' }}>
                {[1, 2, 3].map((index) => (
                    <Card key={index} sx={{
                        minWidth: 200,
                        backgroundColor: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        borderRadius: 2
                    }}>
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                            <Skeleton variant="text" width={40} height={48} sx={{ mx: 'auto', mb: 1 }} />
                            <Skeleton variant="text" width={120} height={24} sx={{ mx: 'auto', mb: 1 }} />
                            <Skeleton variant="text" width={100} height={20} sx={{ mx: 'auto' }} />
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Contractor Table */}
            <Card sx={{
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                borderRadius: 2
            }}>
                <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {['פעולות', 'דירוג בטיחות', 'פרויקטים', 'כתובת', 'ח"פ', 'קבלן'].map((header, index) => (
                                    <TableCell key={index} sx={{
                                        fontWeight: 'bold',
                                        backgroundColor: '#f8f9fa',
                                        textAlign: 'center',
                                        borderBottom: '2px solid #e0e0e0'
                                    }}>
                                        {header}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[1, 2, 3, 4, 5].map((rowIndex) => (
                                <TableRow key={rowIndex} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                                    {/* פעולות */}
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                            <Skeleton variant="circular" width={32} height={32} />
                                            <Skeleton variant="circular" width={32} height={32} />
                                        </Box>
                                    </TableCell>

                                    {/* דירוג בטיחות */}
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 3, mx: 'auto' }} />
                                    </TableCell>

                                    {/* פרויקטים */}
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 2, mx: 'auto' }} />
                                            <Skeleton variant="text" width={40} height={16} sx={{ mx: 'auto' }} />
                                            <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 2, mx: 'auto' }} />
                                            <Skeleton variant="text" width={40} height={16} sx={{ mx: 'auto' }} />
                                        </Box>
                                    </TableCell>

                                    {/* כתובת */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Skeleton variant="circular" width={16} height={16} />
                                            <Skeleton variant="text" width={120} height={20} />
                                        </Box>
                                    </TableCell>

                                    {/* ח"פ */}
                                    <TableCell sx={{ textAlign: 'center' }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Skeleton variant="text" width={80} height={20} />
                                            <Skeleton variant="text" width={60} height={16} />
                                        </Box>
                                    </TableCell>

                                    {/* קבלן */}
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Skeleton variant="text" width={150} height={24} />
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Skeleton variant="circular" width={16} height={16} />
                                                <Skeleton variant="text" width={100} height={16} />
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Skeleton variant="circular" width={16} height={16} />
                                                <Skeleton variant="text" width={120} height={16} />
                                            </Box>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
};

export default SkeletonLoader;
