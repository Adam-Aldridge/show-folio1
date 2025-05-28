// components/PostCard.js
import Image from "next/image";
import styles from "../styles/PostCard.module.css"; // Adjust path if needed, e.g., "../styles/PostCard.module.css"

// Add onEdit prop
const PostCard = ({ post, onDelete, onEdit }) => {
  if (!post) return null;

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
      onDelete(post);
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(post); // Pass the post data to the edit handler
  };

  return (
    <div className={styles.cardContainer}>
      <a
        href={post.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cardLink}
      >
        <div className={styles.imageContainer}>
          {post.imageUrl ? (
            <Image
              src={post.imageUrl}
              alt={post.title}
              width={300}
              height={180}
              className={styles.image}
              priority={false}
            />
          ) : (
            <span>No Image</span>
          )}
        </div>
        <div className={styles.content}>
          <h3 className={styles.title}>{post.title}</h3>
          <p className={styles.description}>{post.description}</p>
        </div>
      </a>
      <div className={styles.actionsContainer}>
        {" "}
        {/* New container for buttons */}
        <button
          onClick={handleEditClick}
          className={`${styles.actionButton} ${styles.editButton}`}
          title="Edit Post"
        >
          ✏️ {/* Edit Icon (simple emoji) */}
        </button>
        <button
          onClick={handleDeleteClick}
          className={`${styles.actionButton} ${styles.deleteButton}`}
          title="Delete Post"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default PostCard;
