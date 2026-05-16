import {
	IconBrandDocker,
	IconCode,
	IconLock,
	IconMapPin,
	IconServer,
} from "@tabler/icons-react";
import cn from "classnames";
import EasyModal, { type InnerModalProps } from "ez-modal-react";
import { Field, Form, Formik } from "formik";
import { type ReactNode, useState } from "react";
import { Alert } from "react-bootstrap";
import Modal from "react-bootstrap/Modal";
import {
	AccessField,
	Button,
	DomainNamesField,
	HasPermission,
	Loading,
	LocationsFields,
	NginxConfigField,
	SSLCertificateField,
	SSLOptionsFields,
} from "src/components";
import { useProxyHost, useSetProxyHost, useUser, useDockerContainers } from "src/hooks";
import { intl, T } from "src/locale";
import { MANAGE, PROXY_HOSTS } from "src/modules/Permissions";
import { validateNumber, validateString } from "src/modules/Validations";
import { showObjectSuccess } from "src/notifications";

const showProxyHostModal = (id: number | "new") => {
	EasyModal.show(ProxyHostModal, { id });
};

interface Props extends InnerModalProps {
	id: number | "new";
}
const ProxyHostModal = EasyModal.create(({ id, visible, remove }: Props) => {
	const { data: currentUser, isLoading: userIsLoading, error: userError } = useUser("me");
	const { data, isLoading, error } = useProxyHost(id);
	const { mutate: setProxyHost } = useSetProxyHost();
	const { data: dockerContainers } = useDockerContainers();
	const [errorMsg, setErrorMsg] = useState<ReactNode | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const onSubmit = async (values: any, { setSubmitting }: any) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMsg(null);

		const { ...payload } = {
			id: id === "new" ? undefined : id,
			...values,
		};

		setProxyHost(payload, {
			onError: (err: any) => setErrorMsg(<T id={err.message} />),
			onSuccess: () => {
				showObjectSuccess("proxy-host", "saved");
				remove();
			},
			onSettled: () => {
				setIsSubmitting(false);
				setSubmitting(false);
			},
		});
	};

	const modalTitle = id === "new"
		? intl.formatMessage({ id: "object.add" }, { object: "proxy-host" })
		: (data?.domainNames?.[0] || intl.formatMessage({ id: "object.edit" }, { object: "proxy-host" }));

	return (
		<Modal show={visible} onHide={remove} size="lg">
			{!isLoading && (error || userError) && (
				<Alert variant="danger" className="m-3">
					{error?.message || userError?.message || intl.formatMessage({ id: "unknown-error" })}
				</Alert>
			)}
			{isLoading || (userIsLoading && <Loading noLogo />)}
			{!isLoading && !userIsLoading && data && currentUser && (
				<Formik
					initialValues={
						{
							// Details tab
							domainNames: data?.domainNames || [],
							forwardScheme: data?.forwardScheme || "http",
							forwardHost: data?.forwardHost || "",
							forwardPort: data?.forwardPort || undefined,
							accessListId: data?.accessListId || 0,
							cachingEnabled: data?.cachingEnabled || false,
							blockExploits: data?.blockExploits || false,
							allowWebsocketUpgrade: data?.allowWebsocketUpgrade || false,
							// Locations tab
							locations: data?.locations || [],
							// SSL tab
							certificateId: data?.certificateId || 0,
							sslForced: data?.sslForced || false,
							http2Support: data?.http2Support || false,
							hstsEnabled: data?.hstsEnabled || false,
							hstsSubdomains: data?.hstsSubdomains || false,
							trustForwardedProto: data?.trustForwardedProto || false,
							// Advanced tab
							advancedConfig: data?.advancedConfig || "",
							meta: data?.meta || {},
						} as any
					}
					onSubmit={onSubmit}
				>
					{({ setFieldValue }) => (
						<Form>
							<Modal.Header closeButton>
								<Modal.Title className="d-flex align-items-center gap-2">
									<IconServer size={20} className="text-muted" />
									<span>{modalTitle}</span>
								</Modal.Title>
							</Modal.Header>
							<Modal.Body className="p-0">
								<Alert variant="danger" show={!!errorMsg} onClose={() => setErrorMsg(null)} dismissible>
									{errorMsg}
								</Alert>
								<div className="card m-0 border-0">
									<div className="card-header p-0">
										<ul className="nav nav-tabs card-header-tabs" data-bs-toggle="tabs">
											<li className="nav-item" role="presentation">
												<a
													href="#tab-details"
													className="nav-link active d-flex align-items-center gap-1"
													data-bs-toggle="tab"
													aria-selected="true"
													role="tab"
												>
													<IconServer size={15} />
													<T id="column.details" />
												</a>
											</li>
											<li className="nav-item" role="presentation">
												<a
													href="#tab-locations"
													className="nav-link d-flex align-items-center gap-1"
													data-bs-toggle="tab"
													aria-selected="false"
													tabIndex={-1}
													role="tab"
												>
													<IconMapPin size={15} />
													<T id="column.custom-locations" />
												</a>
											</li>
											<li className="nav-item" role="presentation">
												<a
													href="#tab-ssl"
													className="nav-link d-flex align-items-center gap-1"
													data-bs-toggle="tab"
													aria-selected="false"
													tabIndex={-1}
													role="tab"
												>
													<IconLock size={15} />
													<T id="column.ssl" />
												</a>
											</li>
											<li className="nav-item ms-auto" role="presentation">
												<a
													href="#tab-advanced"
													className="nav-link d-flex align-items-center gap-1"
													title="Advanced"
													data-bs-toggle="tab"
													aria-selected="false"
													tabIndex={-1}
													role="tab"
												>
													<IconCode size={15} />
													<span className="d-none d-sm-inline">Advanced</span>
												</a>
											</li>
										</ul>
									</div>
									<div className="card-body">
										<div className="tab-content">
											<div className="tab-pane active show" id="tab-details" role="tabpanel">
												<DomainNamesField isWildcardPermitted dnsProviderWildcardSupported />

												{/* Forward To section */}
												<div className="mb-3">
													<div className="d-flex align-items-center gap-2 mb-3">
														<span className="text-muted" style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
															Forward To
														</span>
														<hr className="flex-grow-1 my-0" />
													</div>

													{/* Docker container selector */}
													{dockerContainers && dockerContainers.length > 0 && (
														<div className="mb-3">
															<label className="form-label d-flex align-items-center gap-1">
																<IconBrandDocker size={16} className="text-azure" />
																<span>Pick Docker Container</span>
															</label>
															<select
																className="form-select"
																defaultValue=""
																onChange={(e) => {
																	const val = e.target.value;
																	if (!val) return;
																	const [name, port] = val.split("|");
																	setFieldValue("forwardHost", name);
																	setFieldValue("forwardPort", parseInt(port, 10));
																}}
															>
																<option value="">— or type manually below —</option>
																{dockerContainers
																	.filter((c) => c.state === "running")
																	.flatMap((c) =>
																		c.ports && c.ports.length > 0
																			? c.ports.map((p) => ({
																					label: `${c.name}  :${p.containerPort}`,
																					value: `${c.name}|${p.containerPort}`,
																				}))
																			: [{ label: c.name, value: `${c.name}|80` }],
																	)
																	.map((opt) => (
																		<option key={opt.value} value={opt.value}>
																			{opt.label}
																		</option>
																	))}
															</select>
														</div>
													)}

													<div className="row">
														<div className="col-md-3">
															<Field name="forwardScheme">
																{({ field, form }: any) => (
																	<div className="mb-3">
																		<label
																			className="form-label"
																			htmlFor="forwardScheme"
																		>
																			<T id="host.forward-scheme" />
																		</label>
																		<select
																			id="forwardScheme"
																			className={`form-select ${form.errors.forwardScheme && form.touched.forwardScheme ? "is-invalid" : ""}`}
																			required
																			{...field}
																		>
																			<option value="http">http</option>
																			<option value="https">https</option>
																		</select>
																		{form.errors.forwardScheme ? (
																			<div className="invalid-feedback">
																				{form.errors.forwardScheme &&
																				form.touched.forwardScheme
																					? form.errors.forwardScheme
																					: null}
																			</div>
																		) : null}
																	</div>
																)}
															</Field>
														</div>
														<div className="col-md-6">
															<Field name="forwardHost" validate={validateString(1, 255)}>
																{({ field, form }: any) => (
																	<div className="mb-3">
																		<label className="form-label" htmlFor="forwardHost">
																			<T id="proxy-host.forward-host" />
																		</label>
																		<input
																			id="forwardHost"
																			type="text"
																			className={`form-control ${form.errors.forwardHost && form.touched.forwardHost ? "is-invalid" : ""}`}
																			required
																			placeholder="hostname or container name"
																			{...field}
																		/>
																		{form.errors.forwardHost ? (
																			<div className="invalid-feedback">
																				{form.errors.forwardHost &&
																				form.touched.forwardHost
																					? form.errors.forwardHost
																					: null}
																			</div>
																		) : null}
																	</div>
																)}
															</Field>
														</div>
														<div className="col-md-3">
															<Field name="forwardPort" validate={validateNumber(1, 65535)}>
																{({ field, form }: any) => (
																	<div className="mb-3">
																		<label className="form-label" htmlFor="forwardPort">
																			<T id="host.forward-port" />
																		</label>
																		<input
																			id="forwardPort"
																			type="number"
																			min={1}
																			max={65535}
																			className={`form-control ${form.errors.forwardPort && form.touched.forwardPort ? "is-invalid" : ""}`}
																			required
																			placeholder="8080"
																			{...field}
																		/>
																		{form.errors.forwardPort ? (
																			<div className="invalid-feedback">
																				{form.errors.forwardPort &&
																				form.touched.forwardPort
																					? form.errors.forwardPort
																					: null}
																			</div>
																		) : null}
																	</div>
																)}
															</Field>
														</div>
													</div>
												</div>

												<AccessField />
												<div className="my-3">
													<h4 className="py-2">
														<T id="options" />
													</h4>
													<div className="divide-y">
														<div>
															<label className="row" htmlFor="cachingEnabled">
																<span className="col">
																	<T id="host.flags.cache-assets" />
																</span>
																<span className="col-auto">
																	<Field name="cachingEnabled" type="checkbox">
																		{({ field }: any) => (
																			<label className="form-check form-check-single form-switch">
																				<input
																					{...field}
																					id="cachingEnabled"
																					className={cn("form-check-input", {
																						"bg-lime": field.checked,
																					})}
																					type="checkbox"
																				/>
																			</label>
																		)}
																	</Field>
																</span>
															</label>
														</div>
														<div>
															<label className="row" htmlFor="blockExploits">
																<span className="col">
																	<T id="host.flags.block-exploits" />
																</span>
																<span className="col-auto">
																	<Field name="blockExploits" type="checkbox">
																		{({ field }: any) => (
																			<label className="form-check form-check-single form-switch">
																				<input
																					{...field}
																					id="blockExploits"
																					className={cn("form-check-input", {
																						"bg-lime": field.checked,
																					})}
																					type="checkbox"
																				/>
																			</label>
																		)}
																	</Field>
																</span>
															</label>
														</div>
														<div>
															<label className="row" htmlFor="allowWebsocketUpgrade">
																<span className="col">
																	<T id="host.flags.websockets-upgrade" />
																</span>
																<span className="col-auto">
																	<Field name="allowWebsocketUpgrade" type="checkbox">
																		{({ field }: any) => (
																			<label className="form-check form-check-single form-switch">
																				<input
																					{...field}
																					id="allowWebsocketUpgrade"
																					className={cn("form-check-input", {
																						"bg-lime": field.checked,
																					})}
																					type="checkbox"
																				/>
																			</label>
																		)}
																	</Field>
																</span>
															</label>
														</div>
													</div>
												</div>
											</div>
											<div className="tab-pane" id="tab-locations" role="tabpanel">
												<LocationsFields initialValues={data?.locations || []} />
											</div>
											<div className="tab-pane" id="tab-ssl" role="tabpanel">
												<SSLCertificateField
													name="certificateId"
													label="ssl-certificate"
													allowNew
												/>
												<SSLOptionsFields color="bg-lime" forProxyHost={true} />
											</div>
											<div className="tab-pane" id="tab-advanced" role="tabpanel">
												<NginxConfigField />
											</div>
										</div>
									</div>
								</div>
							</Modal.Body>
							<Modal.Footer>
								<Button data-bs-dismiss="modal" onClick={remove} disabled={isSubmitting}>
									<T id="cancel" />
								</Button>
								<HasPermission section={PROXY_HOSTS} permission={MANAGE} hideError>
									<Button
										type="submit"
										actionType="primary"
										className="ms-auto bg-lime"
										isLoading={isSubmitting}
										disabled={isSubmitting}
									>
										<T id="save" />
									</Button>
								</HasPermission>
							</Modal.Footer>
						</Form>
					)}
				</Formik>
			)}
		</Modal>
	);
});

export { showProxyHostModal };
