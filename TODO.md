# Immediate
[x] Use daisy toast elements for UI notifications
[x] When posting contribution (either with API or UI), if the vehicle already exists, prevent creation of it (and don't count credit usage). In the response, we may propose the user to create a variant of the vehicle instead.
[x] While reviewing a proposal I am the author of, I would expect to be able to cancel it. This shouldn't be available from the moderator or admin role, instead they just can decline the proposal.
[x] From the vehicle list, if there are multiple proposal, I would like to be able to click on the pill and get redirected to the modal that allow me to review the proposals (that exists already).
[x] Likewise for the variants, I would like to see all the update proposal and to be able to click on the pill and get redirected to the modal that allow me to review the proposals (that modal exists already).
[x] When running in dev mode, when admin, I would like to have a button to wipe all the vehicles. The same for proposals.
[x] Unify the UI/UX, buttons, fields, vertical / horizontal alignment, grid components features.
[x] I want to have a contribution form using https://daisyui.com/components/steps
[x] Create a new way of displaying vehicles, using cards and flex layout, so it looks better.
[x] Add image caption and alt text fields in the submission form (after image is selected).
[] Add comment field when we want to reject a contribution (that can be seen in user's dashboard's contributions).
[] Provide way to add custom fields to vehicles. The fields will be displayed into a specific step in the workflow form. We should have a way to retrieve all the available fields with the API. Sumitting a contribution with custom fields that's doesn't exist should work, we need to create the fields before. Custom fields can be administered by the admin, to rename it, determine if that is viewable from the vehicle card, vehicle details. The custom fields should be integrated the same way the other default fields (with live-edit in review, diff, ...etc.).
[x] When clicking on a vehicle carrousel arrow, it displays the vehicle details and switches the image instead of just switching the image.
[] I would like to have pagination for the vehicle retrieval, both the UI and API.
[] Keyboard navigation for the vehicle list.
[] Ability to delete a vehicle while being admin.

# Later
[] Add a monetezation mechanism for the users to top-up their credit balance. Use Wise business.
[] Implement i18n
[] Put in place TDD framework and feature tests to cover the application.