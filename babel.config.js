export default {
    presets: [
        ['@babel/preset-env', { targets: { esmodules: true } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
    ],
    // plugins: [isDev && 'react-refresh/babel'].filter(Boolean),
    plugins: [
        process.env.NODE_ENV !== 'production' && 'react-refresh/babel',
    ].filter(Boolean),
};