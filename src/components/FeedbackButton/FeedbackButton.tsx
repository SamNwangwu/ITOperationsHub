import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './FeedbackButton.module.scss';
import { IFeedbackButtonProps } from './IFeedbackButtonProps';
import { SPHttpClient } from '@microsoft/sp-http';

interface IUserInfo {
  displayName: string;
  mail: string;
}

type FeedbackType = 'Bug/Issue' | 'Feature Request' | 'Content Update' | 'General Feedback';
type Priority = 'Low' | 'Medium' | 'High';

const HUB_SITE_URL = 'https://lebaragroup.sharepoint.com/sites/ITOpsHub';
const FEEDBACK_LIST = 'ITOpsFeedback';
const ATTACHMENTS_FOLDER = 'Feedback-Attachments';
const DEFAULT_EMAIL = 'samuel.nwangwu@lebara.com';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.docx'];

// ES5-compatible pad helper
const pad2 = (n: number): string => n < 10 ? '0' + n : '' + n;

const ChatIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
    <circle cx="8" cy="10" r="1.2" fill="#00289e"/>
    <circle cx="12" cy="10" r="1.2" fill="#00289e"/>
    <circle cx="16" cy="10" r="1.2" fill="#00289e"/>
  </svg>
);

export const FeedbackButton: React.FC<IFeedbackButtonProps> = (props) => {
  const { spHttpClient, graphClient, siteUrl, currentPage, notificationEmail } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [userInfo, setUserInfo] = useState<IUserInfo | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | ''>('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch current user info
  useEffect(() => {
    if (graphClient) {
      graphClient.api('/me').select('displayName,mail').get()
        .then((user: IUserInfo) => {
          setUserInfo({ displayName: user.displayName, mail: user.mail });
        })
        .catch((err: Error) => console.warn('Could not fetch user info:', err));
    }
  }, [graphClient]);

  // Remove pulse after animation completes
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (submitted) {
      resetForm();
    }
  }, [submitted]);

  const resetForm = (): void => {
    setIsAnonymous(false);
    setFeedbackType('');
    setPriority('Medium');
    setDescription('');
    setFile(null);
    setSubmitted(false);
    setError('');
  };

  const handleOpen = (): void => {
    setIsOpen(true);
    setShowPulse(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = '.' + selected.name.split('.').pop()!.toLowerCase();
    if (ALLOWED_FILE_TYPES.indexOf(ext) === -1) {
      setError(`File type not allowed. Accepted: ${ALLOWED_FILE_TYPES.join(', ')}`);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setFile(selected);
    setError('');
  };

  const removeFile = (): void => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const generateTitle = (): string => {
    const now = new Date();
    const dateStr = '' + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate());
    const seq = pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
    return 'FB-' + dateStr + '-' + seq;
  };

  const uploadAttachment = async (): Promise<string> => {
    if (!file) return '';

    const now = new Date();
    const timestamp = '' + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) +
      '-' + pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
    const fileName = 'FB-' + timestamp + '-' + file.name;

    const arrayBuffer = await file.arrayBuffer();

    const uploadUrl = `${HUB_SITE_URL}/_api/web/GetFolderByServerRelativeUrl('/sites/ITOpsHub/Shared Documents/${ATTACHMENTS_FOLDER}')/Files/add(url='${encodeURIComponent(fileName)}',overwrite=true)`;

    const response = await spHttpClient.post(
      uploadUrl,
      SPHttpClient.configurations.v1,
      {
        headers: { 'Content-Type': 'application/octet-stream' },
        body: arrayBuffer
      }
    );

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    const data = await response.json();
    return data.ServerRelativeUrl || `${HUB_SITE_URL}/Shared Documents/${ATTACHMENTS_FOLDER}/${fileName}`;
  };

  const createListItem = async (attachmentUrl: string): Promise<void> => {
    const title = generateTitle();
    const submitterName = isAnonymous ? 'Anonymous' : (userInfo?.displayName || 'Unknown');
    const submitterEmail = isAnonymous ? 'anonymous@lebara.com' : (userInfo?.mail || 'unknown@lebara.com');

    // Get the list item entity type
    const listInfoUrl = `${HUB_SITE_URL}/_api/web/lists/getByTitle('${FEEDBACK_LIST}')?$select=ListItemEntityTypeFullName`;
    const listInfoResponse = await spHttpClient.get(listInfoUrl, SPHttpClient.configurations.v1);
    const listInfo = await listInfoResponse.json();
    const entityType = listInfo.ListItemEntityTypeFullName;

    const body: Record<string, unknown> = {
      '__metadata': { 'type': entityType },
      'Title': title,
      'Page': currentPage,
      'SubmittedBy': submitterName,
      'SubmittedByEmail': submitterEmail,
      'FeedbackType': feedbackType,
      'Priority': priority,
      'FBDescription': description,
      'FBStatus': 'New',
      'SubmittedDate': new Date().toISOString()
    };

    if (attachmentUrl) {
      body['AttachmentUrl'] = JSON.stringify({ Url: attachmentUrl, Description: 'Attachment' });
    }

    const createUrl = `${HUB_SITE_URL}/_api/web/lists/getByTitle('${FEEDBACK_LIST}')/items`;
    const response = await spHttpClient.post(
      createUrl,
      SPHttpClient.configurations.v1,
      {
        headers: {
          'Accept': 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'odata-version': '3.0'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message?.value || 'Failed to create feedback item');
    }
  };

  const sendNotification = async (attachmentUrl: string): Promise<void> => {
    const targetEmail = notificationEmail || DEFAULT_EMAIL;
    const submitterName = isAnonymous ? 'Anonymous' : (userInfo?.displayName || 'Unknown');
    const submitterEmail = isAnonymous ? 'anonymous@lebara.com' : (userInfo?.mail || 'unknown@lebara.com');

    const emailBody = [
      'New feedback submitted:',
      '',
      `Page: ${currentPage}`,
      `From: ${submitterName} (${submitterEmail})`,
      `Type: ${feedbackType}`,
      `Priority: ${priority}`,
      '',
      'Description:',
      description,
      '',
      attachmentUrl ? `Attachment: ${attachmentUrl}` : '',
      '',
      `View in list: ${HUB_SITE_URL}/Lists/${FEEDBACK_LIST}`
    ].filter(Boolean).join('\n');

    try {
      await graphClient.api('/me/sendMail').post({
        message: {
          subject: `[ITOps Feedback] ${feedbackType} - ${currentPage} (${priority})`,
          body: { contentType: 'Text', content: emailBody },
          toRecipients: [{ emailAddress: { address: targetEmail } }]
        },
        saveToSentItems: false
      });
    } catch (err) {
      // Non-fatal: feedback is already saved to list
      console.warn('Email notification failed (feedback still saved):', err);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!feedbackType || description.length < 10) return;

    setSubmitting(true);
    setError('');

    try {
      // 1. Upload attachment if present
      let attachmentUrl = '';
      try {
        attachmentUrl = await uploadAttachment();
      } catch (uploadErr) {
        console.warn('Attachment upload failed, creating item without attachment:', uploadErr);
      }

      // 2. Create list item
      await createListItem(attachmentUrl);

      // 3. Send email notification (non-blocking)
      sendNotification(attachmentUrl).catch(() => { /* already logged */ });

      setSubmitted(true);
      setSubmitting(false);

      // Auto-close after 3 seconds
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 3000);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const isFormValid = feedbackType !== '' && description.length >= 10;

  return (
    <>
      {/* Floating Button */}
      <button
        className={`${styles.feedbackButton} ${showPulse ? styles.pulse : ''}`}
        onClick={handleOpen}
        title="Share your feedback"
        aria-label="Open feedback form"
      >
        <ChatIcon />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className={`${styles.backdrop} ${styles.visible}`}
          onClick={handleClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${isOpen ? styles.open : ''}`}
        role="dialog"
        aria-label="Feedback form"
      >
        {/* Header */}
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Share Your Feedback</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
            &times;
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className={styles.panelBody}>
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>&#10003;</div>
              <div className={styles.successText}>Thanks for your feedback!</div>
              <div className={styles.successSubtext}>This panel will close automatically.</div>
            </div>
          </div>
        ) : (
          <>
            {/* Form Body */}
            <div className={styles.panelBody}>
              {/* Error */}
              {error && (
                <div className={styles.errorMessage}>
                  <span>{error}</span>
                  <button className={styles.retryLink} onClick={() => setError('')}>Dismiss</button>
                </div>
              )}

              {/* User Info */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Submitted By</label>
                {userInfo ? (
                  <div className={styles.userInfo}>
                    <div className={styles.userAvatar}>
                      {userInfo.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.userName}>{userInfo.displayName}</div>
                      <div className={styles.userEmail}>{userInfo.mail}</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.userInfo}>Loading user info...</div>
                )}
              </div>

              {/* Anonymous Toggle */}
              <div className={styles.toggleRow}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
                <span className={styles.toggleLabel}>Submit anonymously</span>
              </div>

              {/* Feedback Type */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Feedback Type<span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
                >
                  <option value="" disabled>Select a type...</option>
                  <option value="Bug/Issue">Bug / Issue</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Content Update">Content Update</option>
                  <option value="General Feedback">General Feedback</option>
                </select>
              </div>

              {/* Priority */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Priority<span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Description<span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what's working, what's not, or what you'd like to see..."
                  maxLength={2000}
                />
                <div className={styles.charCount}>
                  {description.length}/2000 {description.length > 0 && description.length < 10 && '(min 10 characters)'}
                </div>
              </div>

              {/* File Upload */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Screenshot / Attachment</label>
                {file ? (
                  <div className={styles.filePreview}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                    <button className={styles.fileRemove} onClick={removeFile} title="Remove file">&times;</button>
                  </div>
                ) : (
                  <div
                    className={styles.fileUpload}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={styles.fileUploadText}>Click to upload a file</div>
                    <div className={styles.fileUploadHint}>PNG, JPG, GIF, PDF, DOCX (max 5MB)</div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className={styles.fileInput}
                  accept=".png,.jpg,.jpeg,.gif,.pdf,.docx"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Footer */}
            <div className={styles.panelFooter}>
              <button
                className={styles.submitButton}
                disabled={!isFormValid || submitting}
                onClick={handleSubmit}
              >
                {submitting && <span className={styles.spinner}></span>}
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default FeedbackButton;
