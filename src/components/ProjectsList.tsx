import React from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    CalendarToday as CalendarIcon,
    AttachMoney as MoneyIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';

export interface Project {
    _id?: string;
    contractorId?: string;
    startDate: string;
    projectName: string;
    description: string;
    value: number;
    isClosed: boolean;
}

interface ProjectsListProps {
    projects: Project[];
    onEditProject: (project: Project, index: number) => void;
    onDeleteProject: (projectId: string) => void;
}

const ProjectsList: React.FC<ProjectsListProps> = ({ projects, onEditProject, onDeleteProject }) => {
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const categorizeProjects = () => {
        const future: Project[] = [];
        const active: Project[] = [];
        const closed: Project[] = [];

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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL');
    };

    const formatValue = (value: number) => {
        return new Intl.NumberFormat('he-IL').format(value);
    };

    const ProjectCard = ({ project, index }: { project: Project; index: number }) => (
        <Card sx={{ mb: 2, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {project.projectName}
                    </Typography>
                    <Box>
                        <IconButton
                            size="small"
                            onClick={() => onEditProject(project, index)}
                            sx={{ mr: 1 }}
                        >
                            <EditIcon />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDeleteProject(project._id || '')}
                            color="error"
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CalendarIcon sx={{ mr: 1, fontSize: 'small', color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                תאריך עליה לקרקע: {formatDate(project.startDate)}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <MoneyIcon sx={{ mr: 1, fontSize: 'small', color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                שווי: ₪{formatValue(project.value)}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <DescriptionIcon sx={{ mr: 1, fontSize: 'small', color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                        תאור: {project.description}
                    </Typography>
                </Box>

                {project.isClosed && (
                    <Chip
                        label="פרויקט סגור"
                        color="error"
                        size="small"
                        sx={{ mt: 1 }}
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
                    color={color}
                    variant="outlined"
                    sx={{ mr: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                    {description}
                </Typography>
            </Box>

            {projects.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    {emptyMessage}
                </Typography>
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
            <ProjectSection
                title="פרויקטים עתידיים"
                projects={future}
                color="primary"
                emptyMessage="אין פרויקטים עתידיים"
                description="פרויקטים שעדיין לא התחילו (תאריך עליה לקרקע עתידי)"
            />

            <Divider sx={{ my: 3 }} />

            <ProjectSection
                title="פרויקטים פעילים"
                projects={active}
                color="success"
                emptyMessage="אין פרויקטים פעילים"
                description="פרויקטים שהתחילו אבל לא מסומנים כסגורים"
            />

            <Divider sx={{ my: 3 }} />

            <ProjectSection
                title="פרויקטים סגורים"
                projects={closed}
                color="error"
                emptyMessage="אין פרויקטים סגורים"
                description="פרויקטים שמסומנים כסגורים"
            />
        </Box>
    );
};

export default ProjectsList;
