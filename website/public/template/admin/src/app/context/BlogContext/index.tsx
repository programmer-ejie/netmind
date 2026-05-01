'use client'
import React, { createContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { BlogPostType, BlogType } from '@/app/(DashboardLayout)/types/blog';
import { BlogPost } from '@/app/data/blog';

export interface BlogContextProps {
    posts: BlogPostType[];
    sortBy: string;
    selectedPost: BlogPostType | null;
    isLoading: boolean;
    setPosts: Dispatch<SetStateAction<BlogPostType[]>>;
    setSortBy: Dispatch<SetStateAction<string>>;
    setSelectedPost: Dispatch<SetStateAction<BlogPostType | null>>;
    setLoading: Dispatch<SetStateAction<boolean>>;
    addComment: (postId: number, newComment: BlogType) => void;
    fetchPostById: (id: number) => Promise<void>;
    error: any;
}

export const BlogContext = createContext<BlogContextProps>({
    posts: [],
    sortBy: 'newest',
    selectedPost: null,
    isLoading: true,
    setPosts: () => { },
    setSortBy: () => { },
    setSelectedPost: () => { },
    setLoading: () => { },
    addComment: () => { },
    fetchPostById: async () => { },
    error: null
});

export const BlogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [posts, setPosts] = useState<BlogPostType[]>([]);
    const [sortBy, setSortBy] = useState<string>('newest');
    const [selectedPost, setSelectedPost] = useState<BlogPostType | null>(null);
    const [isLoading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    // Fetch all posts
    const fetchPosts = async () => {
        try {
            setLoading(true);
            // Use static data instead of API
            setPosts(BlogPost);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch single post
    const fetchPostById = async (id: number) => {
        try {
            setLoading(true);
            // Find post from static data
            const post = BlogPost.find(p => p.id === id);
            if (post) {
                setSelectedPost(post);
                setError(null);
            } else {
                setError("Post not found");
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Add comment locally
    const addComment = async (postId: number, newComment: BlogType) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId ? { ...post, comments: [newComment, ...(post.comments || [])] } : post
            )
        );
        // No API call needed for static site
    };

    // Fetch posts initially
    useEffect(() => {
        fetchPosts();
    }, []);

    const value: BlogContextProps = {
        posts,
        sortBy,
        selectedPost,
        isLoading,
        setPosts,
        setSortBy,
        setSelectedPost,
        setLoading,
        addComment,
        fetchPostById,
        error
    };

    return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};
