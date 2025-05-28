// components/Modal.js
import { useState, useEffect, useRef } from "react";
import styles from "../styles/Modal.module.css"; // Corrected path

const Modal = ({ isOpen, onClose, onSubmit, initialPostData, totalPosts }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(0);

  // New state for content type and external URL
  const [contentType, setContentType] = useState("file"); // 'file' or 'url'
  const [externalUrl, setExternalUrl] = useState("");
  const [contentFile, setContentFile] = useState(null); // Keep for file uploads

  const imageFileRef = useRef(null);
  const contentFileRef = useRef(null);

  const isEditMode = !!initialPostData;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialPostData) {
        setTitle(initialPostData.title || "");
        setDescription(initialPostData.description || "");
        setImagePreview(initialPostData.imageUrl || null);
        setCurrentOrder(
          initialPostData.order !== undefined
            ? initialPostData.order
            : totalPosts > 0
            ? totalPosts - 1
            : 0
        );

        // Set content type and value based on existing data
        if (initialPostData.fileUrl && !initialPostData.isExternalLink) {
          // It's an uploaded file
          setContentType("file");
          setExternalUrl("");
          // We don't pre-fill contentFile, user must re-select if changing
        } else if (initialPostData.fileUrl && initialPostData.isExternalLink) {
          // It's an external URL
          setContentType("url");
          setExternalUrl(initialPostData.fileUrl); // The fileUrl field stores the external URL
        } else {
          // Default or old data without isExternalLink
          setContentType("file");
          setExternalUrl("");
        }
        setContentFile(null); // Always reset file input for edits
        setImageFile(null);
      } else {
        // Add new mode
        setTitle("");
        setDescription("");
        setImageFile(null);
        setContentFile(null);
        setImagePreview(null);
        setCurrentOrder(totalPosts);
        setContentType("file"); // Default to file for new posts
        setExternalUrl("");
      }
      setIsSubmitting(false);
      if (imageFileRef.current) imageFileRef.current.value = "";
      if (contentFileRef.current) contentFileRef.current.value = "";
    }
  }, [isOpen, isEditMode, initialPostData, totalPosts]);

  useEffect(() => {
    // Image preview logic (same as before)
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(imageFile);
    } else if (isEditMode && initialPostData && !imageFile) {
      setImagePreview(initialPostData.imageUrl || null);
    } else {
      setImagePreview(null);
    }
  }, [imageFile, isEditMode, initialPostData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      alert("Title and description are required.");
      return;
    }

    // Validation based on contentType
    if (contentType === "file") {
      if (!isEditMode && !contentFile) {
        // New post, file required
        alert("Please select a content file.");
        return;
      }
      // In edit mode, contentFile is optional if not changing
    } else if (contentType === "url") {
      if (!externalUrl.trim()) {
        alert("Please enter an external URL.");
        return;
      }
      try {
        new URL(externalUrl); // Basic URL validation
      } catch (_) {
        alert("Please enter a valid external URL (e.g., https://example.com).");
        return;
      }
    }

    // Order validation
    let targetOrder = parseInt(currentOrder, 10);
    const maxOrder = isEditMode ? totalPosts - 1 : totalPosts;
    if (isNaN(targetOrder) || targetOrder < 0 || targetOrder > maxOrder) {
      alert(`Position must be between 1 and ${maxOrder + 1}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        imageFile,
        targetOrder,
        // Content-specific fields
        contentType,
        contentFile: contentType === "file" ? contentFile : null,
        externalUrl: contentType === "url" ? externalUrl.trim() : null,
        existingPost: isEditMode ? initialPostData : null,
      });
      onClose();
    } catch (error) {
      console.error("Error submitting post:", error);
      alert(`Failed to submit post: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderChange = (e) => {
    const oneBasedValue = parseInt(e.target.value, 10);
    if (!isNaN(oneBasedValue)) {
      setCurrentOrder(oneBasedValue - 1);
    } else if (e.target.value === "") {
      setCurrentOrder(
        isEditMode && initialPostData ? initialPostData.order : totalPosts - 1
      );
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.modalTitle}>
          {isEditMode ? "Edit Post" : "Add New Post"}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Title, Description, Order inputs (same as before) */}
          <div className={styles.formGroup}>
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="description">Short Description:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          {isEditMode && (
            <div className={styles.formGroup}>
              <label htmlFor="order">Position (1 to {totalPosts}):</label>
              <input
                type="number"
                id="order"
                value={currentOrder + 1}
                onChange={handleOrderChange}
                min="1"
                max={totalPosts}
                required
              />
            </div>
          )}

          {/* Image File input (same as before) */}
          <div className={styles.formGroup}>
            <label htmlFor="imageFile">
              {isEditMode
                ? "Change Card Image (optional):"
                : "Image (for card preview):"}
            </label>
            <input
              type="file"
              id="imageFile"
              ref={imageFileRef}
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              required={!isEditMode}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className={styles.imagePreview}
              />
            )}
            {isEditMode && initialPostData?.imageFileName && !imageFile && (
              <p className={styles.currentFileText}>
                Current:{" "}
                {initialPostData.imageFileName.substring(
                  initialPostData.imageFileName.indexOf("-") + 1
                )}
              </p>
            )}
          </div>

          {/* Content Type Selection */}
          <div className={styles.formGroup}>
            <label>Content Link Type:</label>
            <div>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="contentType"
                  value="file"
                  checked={contentType === "file"}
                  onChange={(e) => setContentType(e.target.value)}
                />{" "}
                Upload File
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="contentType"
                  value="url"
                  checked={contentType === "url"}
                  onChange={(e) => setContentType(e.target.value)}
                />{" "}
                External URL
              </label>
            </div>
          </div>

          {/* Conditional Content Inputs */}
          {contentType === "file" && (
            <div className={styles.formGroup}>
              <label htmlFor="contentFile">
                {isEditMode && initialPostData?.contentFileName && !contentFile
                  ? "Change Content File (optional):"
                  : "Content File (PDF, HTML, Image):"}
              </label>
              <input
                type="file"
                id="contentFile"
                ref={contentFileRef}
                accept=".pdf,.html,.htm,image/*"
                onChange={(e) => setContentFile(e.target.files[0])}
                required={!isEditMode && contentType === "file"} // Required for new post if type is file
              />
              {isEditMode &&
                initialPostData?.contentFileName &&
                !contentFile && (
                  <p className={styles.currentFileText}>
                    Current:{" "}
                    {initialPostData.contentFileName.substring(
                      initialPostData.contentFileName.indexOf("-") + 1
                    )}
                  </p>
                )}
            </div>
          )}

          {contentType === "url" && (
            <div className={styles.formGroup}>
              <label htmlFor="externalUrl">External Content URL:</label>
              <input
                type="url"
                id="externalUrl"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com/document.pdf"
                required={contentType === "url"}
              />
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Adding..."
                : isEditMode
                ? "Update Post"
                : "Add Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
