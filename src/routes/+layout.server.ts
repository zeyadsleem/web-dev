export const load = ({
  locals,
  platform,
}: {
  locals: App.Locals;
  platform: App.Platform | undefined;
}) => ({
  user: locals.user,
  isOwner: !!locals.user && locals.user.id === platform?.env.OWNER_GITHUB_ID,
});
