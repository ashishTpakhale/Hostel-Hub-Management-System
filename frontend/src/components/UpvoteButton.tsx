import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/hooks/use-toast';

interface UpvoteButtonProps {
  issueId: number;
  upvotes: number;
  voters: string[];
}

export const UpvoteButton = ({ issueId, upvotes, voters }: UpvoteButtonProps) => {
  const { user } = useAuth();
  const { upvoteIssue, downvoteIssue } = useData();
  
  const hasVoted = user ? voters.includes(user.email) : false;

  const handleUpvote = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please login to upvote issues',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (hasVoted) {
        await downvoteIssue(issueId);
        toast({
          title: 'Vote removed',
          description: 'Your vote has been removed',
        });
      } else {
        await upvoteIssue(issueId);
        toast({
          title: 'Upvoted',
          description: 'You have upvoted this issue',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update vote',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={hasVoted ? 'default' : 'outline'}
      size="sm"
      onClick={handleUpvote}
      className="gap-1"
    >
      {hasVoted ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
      <span>{upvotes}</span>
    </Button>
  );
};
