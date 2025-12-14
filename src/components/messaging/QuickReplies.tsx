import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface QuickRepliesProps {
  onSelect: (reply: string) => void;
  isUserSeller?: boolean;
}

export function QuickReplies({ onSelect, isUserSeller }: QuickRepliesProps) {
  const { i18n } = useTranslation();
  const isSw = i18n.language === 'sw';

  const buyerReplies = isSw ? [
    'Napendezwa na mali hii',
    'Je, bei inajadiliwa?',
    'Lini naweza kutembelea?',
    'Tafadhali tuma picha zaidi',
    'Je, hati ni halali?',
  ] : [
    "I'm interested in this property",
    'Is the price negotiable?',
    'When can I visit?',
    'Please send more photos',
    'Is the title deed valid?',
  ];

  const sellerReplies = isSw ? [
    'Asante kwa kuwasiliana',
    'Bei ni fasta',
    'Unaweza kutembelea leo',
    'Nitatuma picha zaidi',
    'Ndio, hati ni halali',
    'Unapendezwa na mali ipi?',
  ] : [
    'Thank you for reaching out',
    'The price is fixed',
    'You can visit today',
    "I'll send more photos",
    'Yes, the title is valid',
    'Which property are you interested in?',
  ];

  const replies = isUserSeller ? sellerReplies : buyerReplies;

  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1 -mx-1 scrollbar-hide">
      {replies.map((reply, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(reply)}
          className="text-xs whitespace-nowrap rounded-full h-7 px-3 flex-shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {reply}
        </Button>
      ))}
    </div>
  );
}
