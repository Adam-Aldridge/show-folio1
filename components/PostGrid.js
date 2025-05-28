// components/PostGrid.js
import PostCard from "./PostCard"; // Adjust path if needed
import styles from "../styles/PostGrid.module.css"; // Adjust path if needed

// Add onEdit prop
const PostGrid = ({ posts, onDelete, onEdit }) => {
  if (!posts || posts.length === 0) {
    return (
      <p style={{ textAlign: "center", padding: "20px" }}>
        No posts yet. Click "Add New Post" to get started!
      </p>
    );
  }
  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={onDelete}
          onEdit={onEdit}
        /> // Pass onEdit
      ))}
    </div>
  );
};

export default PostGrid;
