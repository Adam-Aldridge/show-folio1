// pages/index.js
import Head from "next/head";
import { useState, useEffect, useCallback } from "react";
import { db, storage } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  orderBy,
  query,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import PostGrid from "../components/PostGrid";
import Modal from "../components/Modal";
import styles from "../styles/Home.module.css";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);

  // fetchPosts, handleOpenAddModal, handleOpenEditModal, handleModalClose (same as before)
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const postsCollection = collection(db, "posts");
      const q = query(
        postsCollection,
        orderBy("order", "asc"),
        orderBy("createdAt", "desc")
      );
      const postSnapshot = await getDocs(q);
      let postList = postSnapshot.docs.map((docData, index) => {
        const data = docData.data();
        return {
          id: docData.id,
          ...data,
          order: data.order !== undefined ? data.order : index,
        };
      });
      const needsResequencing = postList.some((p, i) => p.order !== i);
      if (needsResequencing && postList.length > 0) {
        console.warn("Post order inconsistency, re-sequencing for UI.");
        postList.sort(
          (a, b) =>
            (a.order ?? Infinity) - (b.order ?? Infinity) ||
            (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
        );
        postList = postList.map((p, i) => ({ ...p, order: i }));
      }
      setPosts(postList);
    } catch (error) {
      console.error("Error fetching posts:", error);
      alert("Could not fetch posts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  const handleOpenAddModal = () => {
    setEditingPost(null);
    setIsModalOpen(true);
  };
  const handleOpenEditModal = (post) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const handleFormSubmit = async ({
    title,
    description,
    imageFile,
    targetOrder,
    contentType,
    contentFile,
    externalUrl, // New content params
    existingPost,
  }) => {
    setIsLoading(true);
    try {
      if (existingPost && existingPost.id) {
        await handleUpdatePost({
          title,
          description,
          imageFile,
          targetOrder,
          contentType,
          contentFile,
          externalUrl,
          existingPost,
        });
      } else {
        await handleAddPost({
          title,
          description,
          imageFile,
          targetOrder,
          contentType,
          contentFile,
          externalUrl,
        });
      }
      await fetchPosts();
    } catch (error) {
      console.error("Form submission error:", error.message); // Log the actual error message
      // Error should be thrown by handlers to keep modal open
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPost = async ({
    title,
    description,
    imageFile,
    targetOrder,
    contentType,
    contentFile,
    externalUrl,
  }) => {
    // Image file validation (already in modal, but good for direct calls)
    if (!imageFile) {
      throw new Error("Image file is required for a new post.");
    }

    const imageFileName = `${Date.now()}-${imageFile.name}`;
    const imageStorageRef = ref(storage, `post_images/${imageFileName}`);
    await uploadBytes(imageStorageRef, imageFile);
    const imageUrl = await getDownloadURL(imageStorageRef);

    let postFileUrl = "";
    let postContentFileName = null;
    let postIsExternalLink = false;

    if (contentType === "file") {
      if (!contentFile) {
        throw new Error("Content file is required when type is 'file'.");
      }
      postContentFileName = `${Date.now()}-${contentFile.name}`;
      const contentFileStorageRef = ref(
        storage,
        `post_files/${postContentFileName}`
      );
      await uploadBytes(contentFileStorageRef, contentFile);
      postFileUrl = await getDownloadURL(contentFileStorageRef);
      postIsExternalLink = false;
    } else if (contentType === "url") {
      if (!externalUrl) {
        throw new Error("External URL is required when type is 'url'.");
      }
      postFileUrl = externalUrl;
      postIsExternalLink = true;
      // postContentFileName remains null
    } else {
      throw new Error("Invalid content type specified.");
    }

    const newPostData = {
      title,
      description,
      imageUrl,
      imageFileName, // For card image
      fileUrl: postFileUrl, // This will be the external URL or Firebase Storage URL
      contentFileName: postContentFileName, // Null if external URL
      isExternalLink: postIsExternalLink, // Flag
      createdAt: serverTimestamp(),
      order: posts.length, // Add to the end by default
      // targetOrder for new posts is not implemented for simplicity, always append
    };

    const postsCollection = collection(db, "posts");
    await addDoc(postsCollection, newPostData); // No batch needed for single add
    alert("Post added successfully!");
  };

  const handleUpdatePost = async ({
    title,
    description,
    imageFile,
    targetOrder,
    contentType,
    contentFile,
    externalUrl,
    existingPost,
  }) => {
    const postDocRef = doc(db, "posts", existingPost.id);
    const updatedPostFields = {
      title,
      description,
      updatedAt: serverTimestamp(),
    };

    // Handle Card Image File Update (same as before)
    if (imageFile) {
      if (existingPost.imageFileName) {
        /* delete old image */ try {
          await deleteObject(
            ref(storage, `post_images/${existingPost.imageFileName}`)
          );
        } catch (e) {
          console.warn("Old image deletion failed:", e.message);
        }
      } else if (existingPost.imageUrl) {
        try {
          await deleteObject(ref(storage, existingPost.imageUrl));
        } catch (e) {
          console.warn("Old image by URL deletion failed", e.message);
        }
      }
      const newImageFileName = `${Date.now()}-${imageFile.name}`;
      const newImageRef = ref(storage, `post_images/${newImageFileName}`);
      await uploadBytes(newImageRef, imageFile);
      updatedPostFields.imageUrl = await getDownloadURL(newImageRef);
      updatedPostFields.imageFileName = newImageFileName;
    }

    // Handle Content Link Update (File or URL)
    if (contentType === "file" && contentFile) {
      // New file uploaded
      // Delete old content file from storage if it was a file and not an external link
      if (existingPost.contentFileName && !existingPost.isExternalLink) {
        const oldContentFileRef = ref(
          storage,
          `post_files/${existingPost.contentFileName}`
        );
        try {
          await deleteObject(oldContentFileRef);
        } catch (e) {
          console.warn("Old content file deletion failed:", e.message);
        }
      } else if (
        existingPost.fileUrl &&
        !existingPost.isExternalLink &&
        !existingPost.contentFileName
      ) {
        // fallback for old file data
        try {
          await deleteObject(ref(storage, existingPost.fileUrl));
        } catch (e) {
          console.warn("Old content by URL deletion failed", e.message);
        }
      }

      const newContentFileName = `${Date.now()}-${contentFile.name}`;
      const newContentFileRef = ref(
        storage,
        `post_files/${newContentFileName}`
      );
      await uploadBytes(newContentFileRef, contentFile);
      updatedPostFields.fileUrl = await getDownloadURL(newContentFileRef);
      updatedPostFields.contentFileName = newContentFileName;
      updatedPostFields.isExternalLink = false;
    } else if (contentType === "url" && externalUrl) {
      // Switched to or updated an external URL
      // If previous was a file, delete it from storage
      if (existingPost.contentFileName && !existingPost.isExternalLink) {
        const oldContentFileRef = ref(
          storage,
          `post_files/${existingPost.contentFileName}`
        );
        try {
          await deleteObject(oldContentFileRef);
        } catch (e) {
          console.warn(
            "Old content file (switching to URL) deletion failed:",
            e.message
          );
        }
      } else if (
        existingPost.fileUrl &&
        !existingPost.isExternalLink &&
        !existingPost.contentFileName
      ) {
        // fallback
        try {
          await deleteObject(ref(storage, existingPost.fileUrl));
        } catch (e) {
          console.warn(
            "Old content by URL (switching to URL) deletion failed",
            e.message
          );
        }
      }

      updatedPostFields.fileUrl = externalUrl;
      updatedPostFields.isExternalLink = true;
      updatedPostFields.contentFileName = null; // Clear contentFileName if it's now a URL
    }
    // If contentType is 'file' but no new contentFile is provided, we keep the existing fileUrl/contentFileName/isExternalLink
    // If contentType is 'url' but no new externalUrl is provided (should be caught by validation), we keep existing.

    const batch = writeBatch(db);
    const currentPosts = [...posts];
    const oldOrder = existingPost.order;

    if (targetOrder !== undefined && targetOrder !== oldOrder) {
      updatedPostFields.order = targetOrder;
      let itemsToReorder = currentPosts.filter((p) => p.id !== existingPost.id);
      const movedItem = { ...existingPost, ...updatedPostFields };
      itemsToReorder.splice(targetOrder, 0, movedItem);
      itemsToReorder.forEach((post, index) => {
        const originalPostData = currentPosts.find((p) => p.id === post.id);
        if (index !== originalPostData?.order || post.id === existingPost.id) {
          const postRef = doc(db, "posts", post.id);
          if (post.id === existingPost.id) {
            batch.update(postRef, { ...updatedPostFields, order: index });
          } else {
            batch.update(postRef, { order: index });
          }
        }
      });
    } else {
      batch.update(postDocRef, updatedPostFields);
      if (targetOrder !== undefined && updatedPostFields.order === undefined) {
        // ensure order is set if provided
        batch.update(postDocRef, { order: targetOrder });
      } else if (targetOrder !== undefined) {
        updatedPostFields.order = targetOrder; // Make sure it's part of the update if no other order logic ran
        batch.update(postDocRef, updatedPostFields);
      }
    }
    await batch.commit();
    alert("Post updated successfully!");
  };

  const handleDeletePost = async (postToDelete) => {
    if (!postToDelete || !postToDelete.id) {
      return;
    }
    setIsLoading(true);
    try {
      const postDocRef = doc(db, "posts", postToDelete.id);
      await deleteDoc(postDocRef);

      // Delete card image from storage
      if (postToDelete.imageFileName) {
        try {
          await deleteObject(
            ref(storage, `post_images/${postToDelete.imageFileName}`)
          );
        } catch (e) {
          console.warn(
            `Failed to delete image ${postToDelete.imageFileName}: ${e.message}`
          );
        }
      } else if (postToDelete.imageUrl) {
        try {
          await deleteObject(ref(storage, postToDelete.imageUrl));
        } catch (e) {
          console.warn("Failed to delete by image URL", e.message);
        }
      }

      // Delete content file from storage ONLY IF IT'S NOT AN EXTERNAL LINK
      if (!postToDelete.isExternalLink && postToDelete.contentFileName) {
        try {
          await deleteObject(
            ref(storage, `post_files/${postToDelete.contentFileName}`)
          );
        } catch (e) {
          console.warn(
            `Failed to delete content file ${postToDelete.contentFileName}: ${e.message}`
          );
        }
      } else if (
        !postToDelete.isExternalLink &&
        postToDelete.fileUrl &&
        !postToDelete.contentFileName
      ) {
        // fallback for old data
        try {
          await deleteObject(ref(storage, postToDelete.fileUrl));
        } catch (e) {
          console.warn("Failed to delete content by URL", e.message);
        }
      }

      const remainingPosts = posts
        .filter((p) => p.id !== postToDelete.id)
        .sort((a, b) => a.order - b.order)
        .map((p, index) => ({ ...p, order: index }));
      const batch = writeBatch(db);
      remainingPosts.forEach((p) => {
        const originalPost = posts.find((op) => op.id === p.id);
        if (originalPost && originalPost.order !== p.order) {
          batch.update(doc(db, "posts", p.id), { order: p.order });
        }
      });
      await batch.commit();
      setPosts(remainingPosts);
      alert(`Post "${postToDelete.title}" deleted successfully!`);
    } catch (error) {
      /* ... */
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Volvox</title>
        <meta name="description" content="A simple app to display posts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.container}>
        <header className={styles.header}>
          <h1>volvox page | Adam Aldridge</h1>
          <button onClick={handleOpenAddModal} className={styles.addButton}>
            Add New Post
          </button>
        </header>
        {isLoading && posts.length === 0 ? (
          <p className={styles.loadingText}>Loading posts...</p>
        ) : (
          <PostGrid
            posts={posts}
            onDelete={handleDeletePost}
            onEdit={handleOpenEditModal}
          />
        )}
        <Modal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleFormSubmit}
          initialPostData={editingPost}
          totalPosts={posts.length}
        />
      </main>
    </>
  );
}
