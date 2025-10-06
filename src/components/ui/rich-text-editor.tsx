import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onInsertProductLink?: () => void;
  onInsertSolutionImage?: () => void;
  onEditorReady?: (editor: any) => void;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Digite sua resposta...",
  onInsertProductLink,
  onInsertSolutionImage,
  onEditorReady,
  className
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80 transition-colors',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  return (
    <div className={cn("border border-input rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-input bg-muted/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('bold') ? 'bg-primary text-primary-foreground' : ''
          )}
          type="button"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('italic') ? 'bg-primary text-primary-foreground' : ''
          )}
          type="button"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={addLink}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('link') ? 'bg-primary text-primary-foreground' : ''
          )}
          type="button"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        {onInsertProductLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={onInsertProductLink}
            className="h-8 text-xs px-2"
            type="button"
          >
            🔗 Produto
          </Button>
        )}

        {onInsertSolutionImage && (
          <Button
            variant="outline"
            size="sm"
            onClick={onInsertSolutionImage}
            className="h-8 text-xs px-2"
            type="button"
          >
            <ImageIcon className="h-3 w-3 mr-1" />
            Solução
          </Button>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('bulletList') ? 'bg-primary text-primary-foreground' : ''
          )}
          type="button"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8 p-0",
            editor.isActive('orderedList') ? 'bg-primary text-primary-foreground' : ''
          )}
          type="button"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        {editor.isActive('link') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={removeLink}
            className="h-8 text-xs px-2 ml-2"
            type="button"
          >
            Remover Link
          </Button>
        )}
      </div>

      {/* Editor */}
      <EditorContent 
        editor={editor} 
        className="min-h-[100px] p-3 prose prose-sm max-w-none focus-within:outline-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1"
        placeholder={placeholder}
      />
    </div>
  );
};