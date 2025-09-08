import React from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Card,
    CardContent,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    CalendarToday as CalendarIcon,
    AttachMoney as MoneyIcon,
    Description as DescriptionIcon,
    LocationOn as LocationOnIcon
} from '@mui/icons-material';

export interface Project {
    _id?: string;
    contractorId?: string;
    startDate: string;
    projectName: string;
    description: string;
    valueNis?: number;
    durationMonths?: number;
    isClosed: boolean;
    city?: string;
    contractorName?: string;
}

interface ProjectsListProps {
    projects: Project[];
    onEditProject: (project: Project, index: number) => void;
    onDeleteProject: (projectId: string) => void;
    activeTab?: 'all' | 'future' | 'active' | 'closed';
}

const ProjectsList: React.FC<ProjectsListProps> = ({ projects, onEditProject, onDeleteProject, activeTab = 'all' }) => {
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const categorizeProjects = () => {
        const future: Project[] = [];
        const active: Project[] = [];
        const closed: Project[] = [];

        if (!projects || !Array.isArray(projects)) {
            return { future, active, closed };
        }

        projects.forEach(project => {
            const projectDate = new Date(project.startDate);

            if (projectDate > today) {
                // פרויקט עתידי - תאריך עליה לקרקע גדול מהיום
                future.push(project);
            } else if (project.isClosed) {
                // פרויקט סגור - רק אם מסומן כסגור
                closed.push(project);
            } else {
                // פרויקט פעיל - תאריך עבר אבל לא מסומן כסגור
                active.push(project);
            }
        });

        return { future, active, closed };
    };

    const { future, active, closed } = categorizeProjects();

    const getFilteredProjects = () => {
        switch (activeTab) {
            case 'future':
                return future;
            case 'active':
                return active;
            case 'closed':
                return closed;
            default:
                // For 'all' tab, return all projects sorted by date (most future first)
                if (!projects || !Array.isArray(projects)) {
                    return [];
                }
                return projects.sort((a, b) => {
                    const dateA = new Date(a.startDate);
                    const dateB = new Date(b.startDate);
                    return dateB.getTime() - dateA.getTime(); // Most future first
                });
        }
    };

    const filteredProjects = getFilteredProjects();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL');
    };

    const formatValue = (value: number) => {
        return new Intl.NumberFormat('he-IL').format(value);
    };

    const openProjectInNewWindow = (project: Project, mode: 'view' | 'edit' | 'new') => {
        // Get session ID from current URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');
        
        // Create URL parameters for the project data
        const params = new URLSearchParams();
        params.set('mode', mode);
        
        // Add session ID to the new window URL
        if (sessionId) {
            params.set('sessionId', sessionId);
        }

        if (mode === 'new') {
            params.set('project_id', 'new');
        } else {
            params.set('project_id', project._id || project.id || '');
            // Store project data in sessionStorage for the new window to access
            sessionStorage.setItem('project_data', JSON.stringify(project));
        }

        // Open new window with project details
        const newWindow = window.open(
            `/project?${params.toString()}`,
            '_blank',
            'width=1200,height=800,scrollbars=yes,resizable=yes'
        );
    };

    const ProjectCard = ({ project, index }: { project: Project; index: number }) => (
        <Card sx={{
            mb: 2,
            backgroundColor: '#fafafa',
            border: '1px solid #e0e0e0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            borderRadius: 2
        }}>
            <CardContent sx={{ padding: '16px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ color: '#666', fontWeight: 500, mr: 2 }}>
                            {project.projectName}
                        </Typography>
                        {project.city && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocationOnIcon sx={{ mr: 0.5, fontSize: 'small', color: '#888' }} />
                                <Typography variant="body2" sx={{ color: '#888' }}>
                                    {project.city}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Box>
                        <IconButton
                            size="small"
                            onClick={() => openProjectInNewWindow(project, 'edit')}
                            sx={{ color: '#666', mr: 1 }}
                        >
                            <EditIcon />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDeleteProject(project._id || '')}
                            sx={{ color: '#666' }}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                </Box>

                {/* שורה ראשונה: תאריך התחלת הפרויקט + משך הפרויקט */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarIcon sx={{ mr: 1, fontSize: 'small', color: '#888' }} />
                    <Typography variant="body2" sx={{ color: '#888', mr: 3 }}>
                        תאריך התחלת הפרויקט: {formatDate(project.startDate)}
                    </Typography>
                    {project.durationMonths && (
                        <>
                            <CalendarIcon sx={{ mr: 1, fontSize: 'small', color: '#888' }} />
                            <Typography variant="body2" sx={{ color: '#888' }}>
                                משך הפרויקט: {project.durationMonths} חודשים
                            </Typography>
                        </>
                    )}
                </Box>

                {/* שורה שנייה: שווי + תאור */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <MoneyIcon sx={{ mr: 1, fontSize: 'small', color: '#888', mt: 0.5 }} />
                    <Typography variant="body2" sx={{ color: '#888', mr: 3, minWidth: '120px' }}>
                        שווי: ₪{formatValue(project.valueNis || 0)}
                    </Typography>
                    <DescriptionIcon sx={{ mr: 1, fontSize: 'small', color: '#888', mt: 0.5 }} />
                    <Typography variant="body2" sx={{ color: '#888', flex: 1 }}>
                        תאור: {project.description}
                    </Typography>
                </Box>

                {project.isClosed && (
                    <Chip
                        label="פרויקט סגור"
                        sx={{
                            mt: 1,
                            backgroundColor: '#f5f5f5',
                            color: '#666',
                            border: '1px solid #e0e0e0'
                        }}
                        size="small"
                    />
                )}
            </CardContent>
        </Card>
    );

    const ProjectSection = ({ title, projects, color, emptyMessage, description }: {
        title: string;
        projects: Project[];
        color: 'primary' | 'success' | 'error';
        emptyMessage: string;
        description: string;
    }) => (
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                    label={`${title} (${projects.length})`}
                    sx={{
                        mr: 2,
                        backgroundColor: '#f5f5f5',
                        color: '#666',
                        border: '1px solid #e0e0e0',
                        fontWeight: 500
                    }}
                    variant="outlined"
                />
                <Typography variant="body2" sx={{ color: '#888' }}>
                    {description}
                </Typography>
            </Box>

            {projects.length === 0 ? (
                <Card sx={{
                    mb: 2,
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderRadius: 2
                }}>
                    <CardContent sx={{ padding: '16px' }}>
                        <Typography variant="body1" sx={{ color: '#888', textAlign: 'center' }}>
                            {emptyMessage}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                projects.map((project, index) => (
                    <ProjectCard
                        key={project._id || Math.random().toString()}
                        project={project}
                        index={projects.indexOf(project)}
                    />
                ))
            )}
        </Box>
    );

    return (
        <Box>
            {activeTab === 'all' ? (
                <Box>
                    {filteredProjects.length === 0 ? (
                        <Card sx={{
                            mb: 2,
                            backgroundColor: '#fafafa',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            borderRadius: 2
                        }}>
                            <CardContent sx={{ padding: '16px' }}>
                                <Typography variant="body1" sx={{ color: '#888', textAlign: 'center' }}>
                                    אין פרויקטים
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredProjects.map((project, index) => (
                            <ProjectCard
                                key={project._id || Math.random().toString()}
                                project={project}
                                index={projects.indexOf(project)}
                            />
                        ))
                    )}
                </Box>
            ) : (
                <Box>
                    {filteredProjects.length === 0 ? (
                        <Card sx={{
                            mb: 2,
                            backgroundColor: '#fafafa',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            borderRadius: 2
                        }}>
                            <CardContent sx={{ padding: '16px' }}>
                                <Typography variant="body1" sx={{ color: '#888', textAlign: 'center' }}>
                                    {activeTab === 'future' && 'אין פרויקטים עתידיים'}
                                    {activeTab === 'active' && 'אין פרויקטים פעילים'}
                                    {activeTab === 'closed' && 'אין פרויקטים סגורים'}
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredProjects.map((project, index) => (
                            <ProjectCard
                                key={project._id || Math.random().toString()}
                                project={project}
                                index={projects.indexOf(project)}
                            />
                        ))
                    )}
                </Box>
            )}
        </Box>
    );
};

export default ProjectsList;
