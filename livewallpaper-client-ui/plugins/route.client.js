export default ({ store, app }) => {
    // Every time the route changes (fired on initialization too)
    app.router.beforeEach((to, from, next) => {
        if (to.query.p) {
            localStorage.signalrPort = to.query.p;
            store.dispatch("local/setPort", to.query.p)
        }
        else {
            store.dispatch("local/setPort", localStorage.signalrPort)
        }
        next();
    })
}