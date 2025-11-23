import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, FolderOpen } from 'lucide-react';

interface ProjectSelectorProps {
  value: string | null;
  onChange: (projectId: string | null) => void;
  required?: boolean;
}

export function ProjectSelector({ value, onChange, required = false }: ProjectSelectorProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState('residential');

  useEffect(() => {
    if (profile) {
      fetchProjects();
    }
  }, [profile]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_type, status')
        .eq('owner_id', profile!.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: 'Error',
        description: 'Project name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          owner_id: profile!.id,
          name: newProjectName,
          description: newProjectDescription,
          project_type: newProjectType,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Project Created',
        description: 'New project has been created successfully',
      });

      setProjects([...projects, data]);
      onChange(data.id);
      setDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectType('residential');
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading projects...</div>;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="project">Project {required && <span className="text-destructive">*</span>}</Label>
      <div className="flex gap-2">
        <Select value={value || 'none'} onValueChange={(val) => onChange(val === 'none' ? null : val)} required={required}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a project">
              {value ? projects.find(p => p.id === value)?.name : required ? "Select a project" : "No project (optional)"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {!required && <SelectItem value="none">No project</SelectItem>}
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>{project.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">({project.project_type})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {required 
          ? 'All listings must belong to a project. Create a new project if needed.'
          : 'Organize your listing by assigning it to a project.'}
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a project to organize your listings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Sunrise Estate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea
                id="projectDescription"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select value={newProjectType} onValueChange={setNewProjectType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="mixed">Mixed Use</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="agricultural">Agricultural</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}