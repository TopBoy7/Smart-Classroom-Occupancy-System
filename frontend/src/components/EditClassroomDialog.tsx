import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Classroom, UpdateClassroomRequest } from '@/types/classroom';

interface EditClassroomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroom: Classroom | null;
  onSubmit: (classId: string, data: UpdateClassroomRequest) => Promise<void>;
}

export default function EditClassroomDialog({
  open,
  onOpenChange,
  classroom,
  onSubmit,
}: EditClassroomDialogProps) {
  const [formData, setFormData] = useState({
    classId: '',
    className: '',
    capacity: 1,
    deviceId: '',
    latestImage: '',
    occupancy: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with classroom data when dialog opens
  useEffect(() => {
    if (open && classroom) {
      setFormData({
        classId: classroom.classId || '',
        className: classroom.className || '',
        capacity: classroom.capacity || 1,
        deviceId: classroom.deviceId || '',
        latestImage: classroom.latestImage || '',
        occupancy: classroom.occupancy || 0,
      });
      setError(null);
    }
  }, [open, classroom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.classId.trim()) {
      setError('Class ID is required');
      return;
    }
    if (!formData.className.trim()) {
      setError('Class name is required');
      return;
    }
    if (formData.capacity < 1) {
      setError('Capacity must be at least 1');
      return;
    }
    if (!formData.deviceId.trim()) {
      setError('Device ID is required');
      return;
    }

    setLoading(true);

    try {
      const updatePayload: UpdateClassroomRequest = {
        classId: formData.classId,
        className: formData.className,
        capacity: formData.capacity,
        deviceId: formData.deviceId,
        latestImage: formData.latestImage,
        occupancy: formData.occupancy,
      };
      await onSubmit(classroom!.classId, updatePayload);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update classroom');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setError(null);
      }
    }
  };

  if (!classroom) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Classroom</DialogTitle>
          <DialogDescription>
            Update classroom information. The latest image cannot be edited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-classId">Class ID *</Label>
            <Input
              id="edit-classId"
              placeholder="e.g., ELT"
              value={formData.classId}
              onChange={(e) =>
                setFormData({ ...formData, classId: e.target.value })
              }
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for the classroom
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-className">Class Name *</Label>
            <Input
              id="edit-className"
              placeholder="e.g., Introduction to Computer Science"
              value={formData.className}
              onChange={(e) =>
                setFormData({ ...formData, className: e.target.value })
              }
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Capacity *</Label>
              <Input
                id="edit-capacity"
                type="number"
                min="1"
                max="500"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value) || 50,
                  })
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-deviceId">Device ID *</Label>
              <Input
                id="edit-deviceId"
                placeholder="e.g., CAM_001"
                value={formData.deviceId}
                onChange={(e) =>
                  setFormData({ ...formData, deviceId: e.target.value })
                }
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                IoT camera identifier
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}