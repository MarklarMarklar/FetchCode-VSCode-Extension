# File & Folder Attachment Feature

## Overview
This feature allows you to attach files and folders to the FetchCoder chat context, making it easier for the AI to understand your codebase without having to mention full paths or exact file names.

## How to Use

### Method 1: Using the Chat Interface Buttons
1. Open FetchCoder Chat (Ctrl+Shift+F C / Cmd+Shift+F C)
2. Click the 📄 button to attach individual files
3. Click the 📁 button to attach entire folders
4. Select the files/folders you want to attach
5. The attached items will appear in the "📎 Attached Context" section
6. Send your message - all attached files will be automatically included in the context

### Method 2: Using the Explorer Context Menu
1. In VS Code's Explorer sidebar, right-click on any file or folder
2. Select "FetchCoder: Add to Chat Context"
3. The file/folder will be automatically attached to the chat
4. The chat panel will open (if not already open) and show the attachment

### Method 3: Using Buttons Near the Input Field
- Two small buttons (📄 and 📁) are also available at the left side of the chat input field for quick access

## Managing Attachments

### Viewing Attachments
- When you have attached files or folders, they appear in the "📎 Attached Context" section at the top of the chat
- Files are shown with 📄 icon
- Folders are shown with 📁 icon

### Removing Attachments
- Click the ✕ button next to any attachment to remove it from the context
- The attachment section will automatically hide when no items are attached

## Benefits

1. **No More Full Paths**: No need to type `/home/user/project/src/components/Button.tsx`
2. **Folder Context**: Attach entire folders so FetchCoder can see all related files
3. **Persistent Context**: Attachments remain for the entire chat session
4. **Visual Feedback**: Clear indication of what's currently in the context
5. **Easy Management**: Add and remove attachments with simple clicks

## Technical Details

- Attached files are read and included in the API request context
- Attached folders include all files within them (excluding node_modules)
- The file contents are sent with relative paths from the workspace root
- Attachments persist for the chat session but are cleared when you clear chat history

## Tips

- Attach related files/folders before asking questions about specific features
- For large folders, be aware that all files will be sent to the API
- Use folder attachments for small, focused directories
- Remove attachments you no longer need to reduce context size
















